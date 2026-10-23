jest.mock("../../src/config/database", () => ({
    pool: { query: jest.fn() }
}));

const { pool } = require("../../src/config/database");
const ProductRepository = require("../../src/repositories/product.repository");

describe("Product repository update", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("updates all supported fields and preserves false and zero values", async () => {
        pool.query.mockResolvedValue([{ affectedRows: 1 }, []]);
        const updates = {
            sku: "SKU-NEW",
            barcode: null,
            name: "Updated Paint",
            categoryId: 2,
            brand: null,
            size: "10 L",
            shade: "White",
            hsnCode: "32091090",
            unitId: 3,
            gstRateId: 4,
            purchasePrice: 1200,
            salePrice: 1500,
            reorderLevel: 0,
            stockAlertDescription: null,
            stockQty: 0,
            active: false
        };

        await ProductRepository.updateProduct(7, updates);

        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("`stock_alert_description` = ?"), [
            "SKU-NEW",
            null,
            "Updated Paint",
            2,
            null,
            "10 L",
            "White",
            "32091090",
            3,
            4,
            1200,
            1500,
            0,
            null,
            0,
            0,
            7
        ]);
    });
});
