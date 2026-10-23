jest.mock("../../src/repositories/product.repository", () => ({
    findById: jest.fn(),
    findByIdsForUpdate: jest.fn(),
    findBySku: jest.fn(),
    findByBarcode: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    updateStockQty: jest.fn()
}));
jest.mock("../../src/repositories/category.repository", () => ({
    findById: jest.fn()
}));
jest.mock("../../src/repositories/unit.repository", () => ({
    findById: jest.fn()
}));
jest.mock("../../src/repositories/gst-rate.repository", () => ({
    findById: jest.fn()
}));
jest.mock("../../src/repositories/audit.repository", () => ({
    createLog: jest.fn()
}));
jest.mock("../../src/repositories/stock.repository", () => ({
    addMovement: jest.fn()
}));
jest.mock("../../src/utils/transaction", () => jest.fn(async callback => callback({ transaction: true })));

const ProductRepository = require("../../src/repositories/product.repository");
const CategoryRepository = require("../../src/repositories/category.repository");
const UnitRepository = require("../../src/repositories/unit.repository");
const GstRateRepository = require("../../src/repositories/gst-rate.repository");
const AuditRepository = require("../../src/repositories/audit.repository");
const StockRepository = require("../../src/repositories/stock.repository");
const withTransaction = require("../../src/utils/transaction");
const ProductService = require("../../src/services/product.service");

describe("Product service update", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ProductRepository.findById.mockResolvedValue({
            id: 4,
            sku: "SKU-004",
            barcode: null,
            stock_qty: "10.50"
        });
        ProductRepository.findByIdsForUpdate.mockResolvedValue([{
            id: 4,
            sku: "SKU-004",
            stock_qty: "10.50"
        }]);
        ProductRepository.findBySku.mockResolvedValue(null);
        ProductRepository.findByBarcode.mockResolvedValue(null);
        ProductRepository.createProduct.mockResolvedValue(51);
        ProductRepository.updateProduct.mockResolvedValue(true);
        ProductRepository.updateStockQty.mockResolvedValue(undefined);
        CategoryRepository.findById.mockResolvedValue({ id: 2 });
        UnitRepository.findById.mockResolvedValue({ id: 3 });
        GstRateRepository.findById.mockResolvedValue({ id: 4 });
        AuditRepository.createLog.mockResolvedValue(undefined);
        StockRepository.addMovement.mockResolvedValue(undefined);
    });

    test("creates product and initial stock movement in the same transaction", async () => {
        const productData = {
            sku: "SKU-051",
            name: "New Paint",
            categoryId: 2,
            unitId: 3,
            gstRateId: 4,
            purchasePrice: 100,
            salePrice: 150,
            stockQty: 12.5
        };
        const savedProduct = { id: 51, sku: "SKU-051", stock_qty: "12.50" };
        ProductRepository.findById.mockResolvedValue(savedProduct);

        const result = await ProductService.createProduct(productData, 9);

        expect(withTransaction).toHaveBeenCalledTimes(1);
        expect(ProductRepository.createProduct).toHaveBeenCalledWith(productData, { transaction: true });
        expect(StockRepository.addMovement).toHaveBeenCalledWith({
            productId: 51,
            movementType: "INITIAL_STOCK",
            qtyIn: 12.5,
            referenceType: "PRODUCT",
            referenceId: "51",
            reason: "Initial stock when product was created",
            createdBy: 9
        }, { transaction: true });
        expect(AuditRepository.createLog).toHaveBeenCalledWith(expect.objectContaining({
            action: "PRODUCT_CREATED",
            entityId: 51
        }), { transaction: true });
        expect(result).toEqual(savedProduct);
    });

    test("persists changes and returns the refreshed product with related details", async () => {
        const savedProduct = {
            id: 4,
            sku: "SKU-004",
            name: "Updated Paint",
            sale_price: "1750.50",
            stock_qty: "0.00",
            active: 0,
            category_name: "Interior Paint",
            unit_name: "Litre",
            gst_rate: 18
        };
        ProductRepository.findById
            .mockResolvedValueOnce({ id: 4, sku: "SKU-004", barcode: null, stock_qty: "10.50" })
            .mockResolvedValueOnce(savedProduct);
        const updates = {
            name: "Updated Paint",
            categoryId: 2,
            unitId: 3,
            gstRateId: 4,
            salePrice: 1750.5,
            stockQty: 0,
            active: false
        };

        const result = await ProductService.updateProduct(4, updates, 9);

        const { stockQty, ...productUpdates } = updates;
        expect(ProductRepository.updateProduct).toHaveBeenCalledWith(4, productUpdates, { transaction: true });
        expect(ProductRepository.updateStockQty).toHaveBeenCalledWith(4, stockQty, { transaction: true });
        expect(StockRepository.addMovement).toHaveBeenCalledWith(expect.objectContaining({
            movementType: "MANUAL_ADJUSTMENT",
            qtyIn: 0,
            qtyOut: 10.5,
            referenceType: "PRODUCT_UPDATE"
        }), { transaction: true });
        expect(ProductRepository.findById).toHaveBeenLastCalledWith(4);
        expect(result).toEqual(savedProduct);
        expect(AuditRepository.createLog).toHaveBeenCalledWith(expect.objectContaining({
            action: "PRODUCT_UPDATED",
            entityId: 4,
            metadata: { updatedFields: Object.keys(updates) }
        }), { transaction: true });
    });

    test("rejects changes that reference an invalid category", async () => {
        CategoryRepository.findById.mockResolvedValue(null);

        await expect(ProductService.updateProduct(4, { categoryId: 999 }, 9)).rejects.toMatchObject({
            statusCode: 400,
            code: "INVALID_CATEGORY"
        });
        expect(ProductRepository.updateProduct).not.toHaveBeenCalled();
    });
});
