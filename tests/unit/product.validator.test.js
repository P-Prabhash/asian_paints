const { createProductSchema, updateProductSchema } = require("../../src/validators/product.validator");

const validProduct = {
    sku: "SKU-001",
    name: "Premium Interior Paint",
    categoryId: 1,
    unitId: 1,
    gstRateId: 1,
    purchasePrice: 1200,
    salePrice: 1500
};

describe("Product validation", () => {
    test("accepts stock alert description and zero stock thresholds", () => {
        const product = createProductSchema.parse({
            ...validProduct,
            reorderLevel: 0,
            stockQty: 0,
            stockAlertDescription: "Restock when empty"
        });

        expect(product.reorderLevel).toBe(0);
        expect(product.stockQty).toBe(0);
        expect(product.stockAlertDescription).toBe("Restock when empty");
    });

    test("allows updating only the stock alert description", () => {
        expect(updateProductSchema.parse({
            stockAlertDescription: "Reorder before stock runs out"
        })).toEqual({
            stockAlertDescription: "Reorder before stock runs out"
        });
    });

    test("rejects stock alert descriptions longer than 255 characters", () => {
        const result = createProductSchema.safeParse({
            ...validProduct,
            stockAlertDescription: "x".repeat(256)
        });

        expect(result.success).toBe(false);
    });
});
