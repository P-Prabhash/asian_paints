const { z } = require("zod");

const MAX_CUSTOMER_BALANCE = 9999999999.99;

const optionalText = (maxLength) => z.preprocess(
    value => typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(maxLength).nullable().optional()
);

const phoneSchema = z.string()
    .trim()
    .min(7, "Mobile number must contain at least 7 characters")
    .max(20, "Mobile number must not exceed 20 characters")
    .regex(/^[+()\d\s-]+$/, "Mobile number contains invalid characters")
    .refine(value => value.replace(/\D/g, "").length >= 7, "Mobile number must contain at least 7 digits");

const optionalPhoneSchema = z.preprocess(
    value => typeof value === "string" && value.trim() === "" ? null : value,
    phoneSchema.nullable().optional()
);

const moneySchema = z.preprocess(
    value => typeof value === "string" && value.trim() !== "" ? Number(value) : value,
    z.number()
        .finite("Amount must be a finite number")
        .min(-MAX_CUSTOMER_BALANCE, "Amount is outside the supported range")
        .max(MAX_CUSTOMER_BALANCE, "Amount is outside the supported range")
        .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, "Amount may have at most 2 decimal places")
);

const creditLimitSchema = z.preprocess(
    value => typeof value === "string" && value.trim() !== "" ? Number(value) : value,
    z.number()
        .finite("Credit limit must be a finite number")
        .min(0, "Credit limit cannot be negative")
        .max(MAX_CUSTOMER_BALANCE, "Credit limit is outside the supported range")
        .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, "Credit limit may have at most 2 decimal places")
);

const createCustomerSchema = z.object({
    name: z.string().trim().min(2, "Customer name is required").max(100),
    customerCode: optionalText(50),
    mobile: phoneSchema,
    alternatePhone: optionalPhoneSchema,
    email: z.preprocess(
        value => typeof value === "string" && value.trim() === "" ? null : value,
        z.string().trim().email("Invalid email address").max(254).nullable().optional()
    ),
    addressLine: optionalText(5000),
    address: optionalText(5000),
    city: optionalText(100),
    state: optionalText(100),
    pinCode: optionalText(20),
    country: optionalText(100),
    gstin: optionalText(20),
    pan: optionalText(10),
    customerType: optionalText(30),
    openingBalance: moneySchema.optional().default(0),
    creditLimit: creditLimitSchema.optional().default(0),
    paymentTerms: optionalText(100),
    notes: optionalText(5000),
    active: z.boolean().optional().default(true)
});

const updateCustomerSchema = createCustomerSchema
    .omit({ openingBalance: true })
    .extend({ openingBalance: z.never().optional() })
    .partial();

const collectPaymentSchema = z.object({
    receiptNo: z.string()
        .trim()
        .min(1, "Receipt number is required")
        .max(50, "Receipt number must not exceed 50 characters")
        .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, "Receipt number may contain letters, numbers, dots, underscores, slashes, and hyphens"),
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
