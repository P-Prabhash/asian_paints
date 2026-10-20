const { z } = require("zod");

const stockAdjustmentSchema = z.object({
    productId: z.number().int().positive("Product ID is required"),
    adjustmentType: z.enum(["ADD", "REMOVE", "SET"]),
    quantity: z.number().min(0, "Quantity must be non-negative"),
    reason: z.string().min(3, "Reason is required for stock adjustment")
});

module.exports = {
    stockAdjustmentSchema
};
