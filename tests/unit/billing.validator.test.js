const {
    billingProductsQuerySchema,
    quoteSchema,
    checkoutSchema
} = require("../../src/validators/billing.validator");

describe("Billing validation", () => {
    test("normalizes POS category filters and page parameters", () => {
        expect(billingProductsQuerySchema.parse({
            categoryFilter: "Sunnam Bags",
            page: "2",
            limit: "100"
        })).toEqual({
            categoryFilter: "SUNNAM",
            page: 2,
            limit: 100
        });
    });

    test("accepts form-style numeric cart and payment values", () => {
        const parsed = checkoutSchema.parse({
            categoryFilter: "PAINT",
            items: [{ productId: "12", qty: "2", discount: "1.5" }],
            payments: [{ method: "CASH", amount: "234.82" }]
        });

        expect(parsed.items[0]).toEqual({ productId: 12, qty: 2, discount: 1.5 });
        expect(parsed.payments[0].amount).toBe(234.82);
    });

    test("rejects unsupported POS category names and invalid pagination", () => {
        expect(billingProductsQuerySchema.safeParse({ categoryFilter: "unknown" }).success).toBe(false);
        expect(billingProductsQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    });

    test("keeps the quote request shape with default billing category", () => {
        expect(quoteSchema.parse({
            items: [{ productId: 1, qty: 1 }]
        })).toMatchObject({
            categoryFilter: "ALL",
            isInterState: false,
            items: [{ productId: 1, qty: 1, discount: 0 }]
        });
    });
});
