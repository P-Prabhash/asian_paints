const { z } = require("zod");

const numericInput = (schema) => z.preprocess(
    value => typeof value === "string" && value.trim() !== "" ? Number(value) : value,
    schema
);

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
    qty: numericInput(z.number().finite().positive("Quantity must be positive")),
    unitCost: numericInput(z.number().finite().min(0, "Unit cost cannot be negative")),
    discount: numericInput(z.number().finite().min(0)).optional().default(0),
    gstRate: numericInput(z.number().finite().min(0).max(100)).optional().default(0)
});

const createPurchaseSchema = z.object({
    supplierId: numericInput(z.number().int().positive("Supplier ID is required")),
    supplierInvoiceNo: z.string().optional().nullable(),
    invoiceDate: z.string().refine(val => !isNaN(Date.parse(val)), "Valid invoice date required"),
    notes: z.string().optional().nullable(),
    items: z.array(purchaseItemSchema).min(1, "At least one item is required")
});

module.exports = {
    createSupplierSchema,
    updateSupplierSchema,
    createPurchaseSchema
};
