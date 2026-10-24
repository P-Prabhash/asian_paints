const { createPurchaseSchema, purchaseIdParamSchema } = require("../../src/validators/supplier.validator");

describe("Purchase request validation", () => {
    test("coerces numeric form values and applies line-item defaults", () => {
        const result = createPurchaseSchema.safeParse({
            supplierId: "3",
            invoiceDate: "2026-10-24",
            items: [{
                productId: "12",
                qty: "4.5",
                unitCost: "125.75",
                gstRate: "18"
            }]
        });

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
            supplierId: 3,
            items: [{
                productId: 12,
                qty: 4.5,
                unitCost: 125.75,
                gstRate: 18,
                discount: 0
            }]
        });
    });

    test("rejects missing items and invalid quantity or tax rate", () => {
        expect(createPurchaseSchema.safeParse({
            supplierId: 3,
            invoiceDate: "2026-10-24",
            items: []
        }).success).toBe(false);

        expect(createPurchaseSchema.safeParse({
            supplierId: 3,
            invoiceDate: "2026-10-24",
            items: [{ productId: 12, qty: 0, unitCost: 5, gstRate: 101 }]
        }).success).toBe(false);

        expect(createPurchaseSchema.safeParse({
            supplierId: 3,
            invoiceDate: "2026-10-24",
            items: [{ productId: 12, qty: 1.234, unitCost: 5 }]
        }).success).toBe(false);
    });

    test("validates positive purchase route IDs from URL strings", () => {
        expect(purchaseIdParamSchema.parse({ id: "44" })).toEqual({ id: 44 });
        expect(purchaseIdParamSchema.safeParse({ id: "0" }).success).toBe(false);
    });
});
