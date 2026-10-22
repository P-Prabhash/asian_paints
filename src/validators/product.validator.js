const { z } = require("zod");

const createProductSchema = z.object({
    sku: z.string().min(1, "SKU is required"),
    barcode: z.string().optional().nullable(),
    name: z.string().min(2, "Product name is required"),
    categoryId: z.number().int().positive("Category ID is required"),
    brand: z.string().optional().nullable(),
    size: z.string().optional().nullable(),
    shade: z.string().optional().nullable(),
    hsnCode: z.string().optional().nullable(),
    unitId: z.number().int().positive("Unit ID is required"),
    gstRateId: z.number().int().positive("GST Rate ID is required"),
    purchasePrice: z.number().min(0, "Purchase price cannot be negative"),
    salePrice: z.number().min(0, "Sale price cannot be negative"),
    reorderLevel: z.number().min(0).optional().default(10),
    stockAlertDescription: z.string().max(255).optional().nullable(),
    stockQty: z.number().optional().default(0),
    active: z.boolean().optional().default(true)
});

const updateProductSchema = createProductSchema.extend({
    reorderLevel: z.number().min(0).optional(),
    stockQty: z.number().optional(),
    active: z.boolean().optional()
}).partial();

const productLookupQuerySchema = z.object({
    code: z.string().min(1, "Search code or barcode is required")
});

const createCategorySchema = z.object({
    name: z.string().min(2, "Category name is required"),
    description: z.string().optional().nullable(),
    active: z.boolean().optional().default(true)
});

const createUnitSchema = z.object({
    code: z.string().min(1, "Unit code is required"),
    name: z.string().min(1, "Unit name is required"),
    baseUnitId: z.number().int().positive().optional().nullable(),
    conversionFactor: z.number().positive().optional().default(1)
});

const createGstRateSchema = z.object({
    rate: z.number().min(0).max(100, "GST rate must be between 0 and 100"),
    name: z.string().min(1, "Name is required"),
    description: z.string().optional().nullable()
});

module.exports = {
    createProductSchema,
    updateProductSchema,
    productLookupQuerySchema,
    createCategorySchema,
    createUnitSchema,
    createGstRateSchema
};
