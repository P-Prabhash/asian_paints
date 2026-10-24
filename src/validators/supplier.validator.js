const { z } = require("zod");

const numericInput = (schema) => z.preprocess(
    value => typeof value === "string" && value.trim() !== "" ? Number(value) : value,
    schema
);

const DECIMAL_MAX = 9999999999.99;
const decimalAmount = numericInput(z.number()
    .finite()
    .min(0)
    .max(DECIMAL_MAX)
    .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, "Amount may have at most 2 decimal places"));

const createSupplierSchema = z.object({
    supplierCode: z.string()
        .trim()
        .min(1, "Supplier ID is required")
        .max(50, "Supplier ID must not exceed 50 characters")
        .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, "Supplier ID may contain letters, numbers, dots, underscores, slashes, and hyphens")
        .optional()
        .nullable(),
    name: z.string().trim().min(2, "Supplier name is required").max(100),
    mobile: z.string().trim().max(20).optional().nullable(),
    address: z.string().trim().max(5000).optional().nullable(),
    gstin: z.string().trim().max(20).optional().nullable(),
    active: z.boolean().optional().default(true)
});

const updateSupplierSchema = createSupplierSchema.partial();

const purchaseItemSchema = z.object({
    productId: numericInput(z.number().int().positive("Product ID is required")),
    qty: numericInput(z.number()
        .finite()
        .positive("Quantity must be positive")
        .max(DECIMAL_MAX)
        .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, "Quantity may have at most 2 decimal places")),
    unitCost: decimalAmount,
    discount: decimalAmount.optional().default(0),
    gstRate: numericInput(z.number()
        .finite()
        .min(0)
        .max(100)
        .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, "GST rate may have at most 2 decimal places"))
        .optional().default(0)
});

const createPurchaseSchema = z.object({
    supplierId: numericInput(z.number().int().positive("Existing supplier database ID must be a positive integer")).optional(),
    supplier: createSupplierSchema.omit({ active: true }).extend({
        supplierCode: z.string()
            .trim()
            .min(1, "Supplier ID is required when entering new supplier details")
            .max(50, "Supplier ID must not exceed 50 characters")
            .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, "Supplier ID may contain letters, numbers, dots, underscores, slashes, and hyphens")
    }).optional(),
    supplierInvoiceNo: z.string().max(100).optional().nullable(),
    invoiceDate: z.string().refine(val => !isNaN(Date.parse(val)), "Valid invoice date required"),
    notes: z.string().optional().nullable(),
    items: z.array(purchaseItemSchema).min(1, "At least one item is required")
}).refine(data => Boolean(data.supplierId) !== Boolean(data.supplier), {
    message: "Provide either an existing supplierId or new supplier details, but not both",
    path: ["supplierId"]
});

const purchaseIdParamSchema = z.object({
    id: numericInput(z.number().int().positive("Purchase ID must be a positive integer"))
});

module.exports = {
    createSupplierSchema,
    updateSupplierSchema,
    createPurchaseSchema,
    purchaseIdParamSchema
};
