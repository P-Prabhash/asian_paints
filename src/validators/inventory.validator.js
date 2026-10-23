const { z } = require("zod");

const DECIMAL_MAX = 9999999999.99;

const numericInput = (schema) => z.preprocess(
    value => typeof value === "string" && value.trim() !== "" ? Number(value) : value,
    schema
);

const stockAdjustmentSchema = z.object({
    productId: numericInput(z.number().int().positive("Product ID is required")),
    adjustmentType: z.enum(["ADD", "REMOVE", "SET"]),
    quantity: numericInput(
        z.number()
            .finite("Quantity must be a finite number")
            .min(0, "Quantity must be non-negative")
            .max(DECIMAL_MAX, "Quantity exceeds the supported range")
            .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, "Quantity may have at most 2 decimal places")
    ),
    reason: z.string().trim().min(3, "Reason is required for stock adjustment").max(255)
}).superRefine(({ adjustmentType, quantity }, ctx) => {
    if (adjustmentType !== "SET" && quantity === 0) {
        ctx.addIssue({
            code: "custom",
            path: ["quantity"],
            message: "Quantity must be greater than zero for ADD and REMOVE adjustments"
        });
    }
});

module.exports = {
    stockAdjustmentSchema
};
