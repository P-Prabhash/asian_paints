const { z } = require("zod");

const createSupplierSchema = z.object({
    name: z.string().min(2, "Supplier name is required"),
    mobile: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    gstin: z.string().optional().nullable(),
    active: z.boolean().optional().default(true)
});

const updateSupplierSchema = createSupplierSchema.partial();

const purchaseItemSchema = z.object({
    productId: z.number().int().positive("Product ID is required"),
    qty: z.number().positive("Quantity must be positive"),
    unitCost: z.number().min(0, "Unit cost cannot be negative"),
    discount: z.number().min(0).optional().default(0),
    gstRate: z.number().min(0).optional().default(0)
});

const createPurchaseSchema = z.object({
    supplierId: z.number().int().positive("Supplier ID is required"),
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
