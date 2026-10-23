jest.mock("../../src/utils/transaction", () => jest.fn(async callback => callback({ transaction: true })));
jest.mock("../../src/repositories/stock.repository", () => ({
    listStock: jest.fn(),
    listMovements: jest.fn(),
    addMovement: jest.fn()
}));
jest.mock("../../src/repositories/product.repository", () => ({
    findByIdsForUpdate: jest.fn(),
    updateStockQty: jest.fn()
}));
jest.mock("../../src/repositories/audit.repository", () => ({
    createLog: jest.fn()
}));

const StockRepository = require("../../src/repositories/stock.repository");
const ProductRepository = require("../../src/repositories/product.repository");
const AuditRepository = require("../../src/repositories/audit.repository");
const InventoryService = require("../../src/services/inventory.service");

describe("Inventory service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ProductRepository.findByIdsForUpdate.mockResolvedValue([{
            id: 8,
            sku: "SKU-008",
            name: "Interior Paint",
            stock_qty: "10.50",
            reorder_level: "5.00"
        }]);
        ProductRepository.updateStockQty.mockResolvedValue(undefined);
        StockRepository.addMovement.mockResolvedValue(undefined);
        AuditRepository.createLog.mockResolvedValue(undefined);
    });

    test("adds decimal stock without string concatenation and records movement", async () => {
        const result = await InventoryService.adjustStock({
            productId: 8,
            adjustmentType: "ADD",
            quantity: 2.25,
            reason: "Received stock"
        }, 3);

        expect(ProductRepository.updateStockQty).toHaveBeenCalledWith(8, 12.75, { transaction: true });
        expect(StockRepository.addMovement).toHaveBeenCalledWith(expect.objectContaining({
            productId: 8,
            movementType: "MANUAL_ADJUSTMENT",
            qtyIn: 2.25,
            qtyOut: 0,
            createdBy: 3
        }), { transaction: true });
        expect(result).toEqual({
            productId: 8,
            sku: "SKU-008",
            productName: "Interior Paint",
            previousStock: 10.5,
            newStock: 12.75,
            lowStock: false,
            adjustmentType: "ADD",
            reason: "Received stock"
        });
    });

    test("records a SET-to-zero adjustment as a stock out movement", async () => {
        const result = await InventoryService.adjustStock({
            productId: 8,
            adjustmentType: "SET",
            quantity: 0,
            reason: "Stock count correction"
        }, 3);

        expect(ProductRepository.updateStockQty).toHaveBeenCalledWith(8, 0, { transaction: true });
        expect(StockRepository.addMovement).toHaveBeenCalledWith(expect.objectContaining({
            qtyIn: 0,
            qtyOut: 10.5
        }), { transaction: true });
        expect(result.lowStock).toBe(true);
    });

    test("rejects removal that exceeds the available stock", async () => {
        await expect(InventoryService.adjustStock({
            productId: 8,
            adjustmentType: "REMOVE",
            quantity: 11,
            reason: "Correction"
        }, 3)).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });

        expect(ProductRepository.updateStockQty).not.toHaveBeenCalled();
        expect(StockRepository.addMovement).not.toHaveBeenCalled();
    });
});
