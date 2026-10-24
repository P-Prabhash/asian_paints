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

    test("binds numeric pagination values for the Swagger billing catalog query", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id: 12, name: "Paint" }], []])
            .mockResolvedValueOnce([[{ total: 1 }], []]);

        const result = await ProductRepository.listProducts({
            categoryFilter: "PAINT",
            activeOnly: true,
            search: "12",
            limit: "50",
            offset: 0
        });

        expect(pool.query).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining("LIMIT ? OFFSET ?"),
            ["%12%", "%12%", "%12%", "%12%", "%paint%", 50, 0]
        );
        expect(result).toEqual({ products: [{ id: 12, name: "Paint" }], total: 1 });
    });

    test("bounds invalid pagination values before constructing SQL", async () => {
        pool.query
            .mockResolvedValueOnce([[], []])
            .mockResolvedValueOnce([[{ total: 0 }], []]);

        await ProductRepository.listProducts({ limit: "50; DROP TABLE products", offset: "-4" });

        expect(pool.query.mock.calls[0][0]).toContain("LIMIT ? OFFSET ?");
        expect(pool.query.mock.calls[0][1]).toEqual([50, 0]);
        expect(pool.query.mock.calls[0][0]).not.toContain("DROP TABLE");
    });
});
