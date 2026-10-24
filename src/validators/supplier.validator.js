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
    name: z.string().min(2, "Supplier name is required"),
    mobile: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    gstin: z.string().optional().nullable(),
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
    supplierId: numericInput(z.number().int().positive("Supplier ID is required")),
    supplierInvoiceNo: z.string().max(100).optional().nullable(),
    invoiceDate: z.string().refine(val => !isNaN(Date.parse(val)), "Valid invoice date required"),
    notes: z.string().optional().nullable(),
    items: z.array(purchaseItemSchema).min(1, "At least one item is required")
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
