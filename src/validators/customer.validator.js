const { z } = require("zod");

const createCustomerSchema = z.object({
    name: z.string().min(2, "Customer name is required"),
    mobile: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    gstin: z.string().optional().nullable(),
    openingBalance: z.number().optional().default(0),
    active: z.boolean().optional().default(true)
});

const updateCustomerSchema = createCustomerSchema.partial();

const collectPaymentSchema = z.object({
    amount: z.number().positive("Collection amount must be greater than zero"),
    paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER"]),
    referenceNo: z.string().optional().nullable(),
    notes: z.string().optional().nullable()
});

module.exports = {
    createCustomerSchema,
    updateCustomerSchema,
    collectPaymentSchema
};
