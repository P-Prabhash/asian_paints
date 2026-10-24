const {
    billingProductsQuerySchema,
    quoteSchema,
    checkoutSchema
} = require("../../src/validators/billing.validator");
const { collectPaymentSchema } = require("../../src/validators/customer.validator");

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
            invoiceNo: "PNT-2026-001",
            categoryFilter: "PAINT",
            items: [{ productId: "12", qty: "2", discount: "1.5" }],
            payments: [{ method: "CASH", amount: "234.82" }]
        });

        expect(parsed.items[0]).toEqual({ productId: 12, qty: 2, discount: 1.5 });
        expect(parsed.payments[0].amount).toBe(234.82);
        expect(parsed.invoiceNo).toBe("PNT-2026-001");
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

    test("normalizes and validates quote and checkout category filters", () => {
        expect(quoteSchema.parse({
            categoryFilter: "Sunnam Bags",
            items: [{ productId: 1, qty: 1 }]
        }).categoryFilter).toBe("SUNNAM");
        expect(checkoutSchema.safeParse({
            invoiceNo: "PNT-2026-001",
            categoryFilter: "UNKNOWN",
            items: [{ productId: 1, qty: 1 }],
            payments: [{ method: "CASH", amount: 100 }]
        }).success).toBe(false);
    });

    test("requires and validates a manual invoice number for checkout", () => {
        expect(checkoutSchema.safeParse({
            items: [{ productId: 1, qty: 1 }],
            payments: [{ method: "CASH", amount: 100 }]
        }).success).toBe(false);
        expect(checkoutSchema.safeParse({
            invoiceNo: "INV 1",
            items: [{ productId: 1, qty: 1 }],
            payments: [{ method: "CASH", amount: 100 }]
        }).success).toBe(false);
    });

    test("requires a valid manually entered collection receipt number", () => {
        expect(collectPaymentSchema.safeParse({
            receiptNo: "REC-2026-009",
            amount: 250,
            paymentMethod: "CASH"
        }).success).toBe(true);
        expect(collectPaymentSchema.safeParse({
            amount: 250,
            paymentMethod: "CASH"
        }).success).toBe(false);
        expect(collectPaymentSchema.safeParse({
            receiptNo: "REC 9",
            amount: 250,
            paymentMethod: "CASH"
        }).success).toBe(false);
    });
});
