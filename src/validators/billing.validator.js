const { z } = require("zod");

const cartItemSchema = z.object({
    productId: z.number().int().positive("Product ID is required"),
    qty: z.number().positive("Quantity must be positive"),
    discount: z.number().min(0).optional().default(0)
});

const paymentRowSchema = z.object({
    method: z.enum(["CASH", "UPI", "CARD", "CREDIT"]),
    amount: z.number().min(0, "Payment amount cannot be negative"),
    referenceNo: z.string().optional().nullable()
});

const quoteSchema = z.object({
    categoryFilter: z.string().optional().default("ALL"),
    isInterState: z.boolean().optional().default(false),
    items: z.array(cartItemSchema).min(1, "Cart must contain at least one product")
});

const customerInfoSchema = z.object({
    id: z.number().int().positive().optional().nullable(),
    name: z.string().trim().min(2).optional().nullable(),
    mobile: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    gstin: z.string().optional().nullable()
});

const checkoutSchema = z.object({
    categoryFilter: z.string().optional().default("ALL"),
    isInterState: z.boolean().optional().default(false),
    customer: customerInfoSchema.optional().nullable(),
    items: z.array(cartItemSchema).min(1, "Cart must contain at least one product"),
    payments: z.array(paymentRowSchema).min(1, "At least one payment method is required"),
    idempotencyKey: z.string().optional().nullable()
});

const saleReturnItemSchema = z.object({
    productId: z.number().int().positive(),
    qty: z.number().positive("Return quantity must be positive")
});

const saleReturnSchema = z.object({
    reason: z.string().min(2, "Reason for return is required"),
    items: z.array(saleReturnItemSchema).min(1, "At least one return item is required")
});

module.exports = {
    quoteSchema,
    checkoutSchema,
    saleReturnSchema
};
