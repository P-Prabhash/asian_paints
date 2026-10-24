const { stockAdjustmentSchema } = require("../../src/validators/inventory.validator");

describe("Stock adjustment validation", () => {
    test("accepts form values and preserves a zero SET quantity", () => {
        expect(stockAdjustmentSchema.parse({
            productId: "12",
            adjustmentType: "SET",
            quantity: "0",
            reason: "Counted stock"
        })).toEqual({
            productId: 12,
            adjustmentType: "SET",
            quantity: 0,
            reason: "Counted stock"
        });
    });

    test.each([
        ["INCREASE", "ADD"],
        ["DECREASE", "REMOVE"]
    ])("normalizes %s adjustment operations to %s", (input, normalized) => {
        expect(stockAdjustmentSchema.parse({
            productId: 12,
            adjustmentType: input,
            quantity: 2,
            reason: "Stock correction"
        }).adjustmentType).toBe(normalized);
    });

    test.each([
        { productId: 12, adjustmentType: "ADD", quantity: 0, reason: "Counted stock" },
        { productId: 12, adjustmentType: "REMOVE", quantity: -1, reason: "Counted stock" },
        { productId: 12, adjustmentType: "ADD", quantity: "2.345", reason: "Counted stock" },
        { productId: "invalid", adjustmentType: "SET", quantity: 5, reason: "Counted stock" },
        { productId: 12, adjustmentType: "SET", quantity: 5, reason: "x" }
    ])("rejects invalid adjustment payloads", payload => {
        expect(stockAdjustmentSchema.safeParse(payload).success).toBe(false);
    });
});
