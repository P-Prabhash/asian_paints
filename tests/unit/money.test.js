const { calculateLineItemTax, calculateInvoiceTotals, roundToTwoDecimals } = require("../../src/utils/money");

describe("Money and GST Calculation Utilities", () => {
    test("roundToTwoDecimals rounds correctly", () => {
        expect(roundToTwoDecimals(10.126)).toBe(10.13);
        expect(roundToTwoDecimals(10.124)).toBe(10.12);
        expect(roundToTwoDecimals(10)).toBe(10);
    });

    test("calculateLineItemTax calculates CGST and SGST for intra-state", () => {
        const result = calculateLineItemTax({
            unitPrice: 100,
            qty: 2,
            discount: 10,
            gstRate: 18,
            isInterState: false
        });

        expect(result.grossSubtotal).toBe(200);
        expect(result.taxableValue).toBe(190);
        expect(result.unitPriceInclusive).toBe(118);
        expect(result.totalTax).toBe(34.20);
        expect(result.cgst).toBe(17.10);
        expect(result.sgst).toBe(17.10);
        expect(result.igst).toBe(0);
        expect(result.lineTotal).toBe(224.20);
    });

    test("returns the GST-inclusive unit price for display", () => {
        const result = calculateLineItemTax({
            unitPrice: 100,
            qty: 1,
            discount: 0,
            gstRate: 18
        });

        expect(result.unitPriceInclusive).toBe(118);
        expect(result.lineTotal).toBe(118);
    });

    test("calculateLineItemTax calculates IGST for inter-state", () => {
        const result = calculateLineItemTax({
            unitPrice: 500,
            qty: 1,
            discount: 0,
            gstRate: 28,
            isInterState: true
        });

        expect(result.taxableValue).toBe(500);
        expect(result.totalTax).toBe(140);
        expect(result.cgst).toBe(0);
        expect(result.sgst).toBe(0);
        expect(result.igst).toBe(140);
        expect(result.lineTotal).toBe(640);
    });

    test("calculateInvoiceTotals sums multiple items and handles round off", () => {
        const items = [
            { unitPrice: 100, qty: 1, discount: 0, gstRate: 18 },
            { unitPrice: 50, qty: 2, discount: 5, gstRate: 12 }
        ];

        const totals = calculateInvoiceTotals(items, false);

        expect(totals.subtotal).toBe(200);
        expect(totals.discountTotal).toBe(5);
        expect(totals.taxableTotal).toBe(195);
        expect(totals.grandTotal).toBeGreaterThan(0);
    });
});
