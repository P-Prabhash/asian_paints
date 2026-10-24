const { z } = require("zod");

const MAX_STOCK_QUANTITY = 9999999999.99;

const numberInput = (schema) => z.preprocess(
    value => typeof value === "string" && value.trim() !== "" ? Number(value) : value,
    schema
);

const booleanInput = (schema) => z.preprocess(
    value => value === "true" ? true : value === "false" ? false : value,
    schema
);

const optionalText = (maxLength = Infinity) => z.preprocess(
    value => typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(maxLength).nullable().optional()
);

const stockQuantityInput = () => numberInput(
    z.number()
        .finite()
        .min(0, "Stock quantity cannot be negative")
        .max(MAX_STOCK_QUANTITY, "Stock quantity exceeds the supported range")
        .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, "Stock quantity may have at most 2 decimal places")
);

const createProductSchema = z.object({
    sku: z.string().trim().min(1, "SKU is required").max(50),
    barcode: optionalText(100),
    name: z.string().trim().min(2, "Product name is required").max(150),
    categoryId: numberInput(z.number().int().positive("Category ID is required")),
    brand: optionalText(100),
    size: optionalText(50),
    shade: optionalText(50),
    hsnCode: optionalText(20),
    unitId: numberInput(z.number().int().positive("Unit ID is required")),
    gstRateId: numberInput(z.number().int().positive("GST Rate ID is required")),
    purchasePrice: numberInput(z.number().finite().min(0, "Purchase price cannot be negative")),
    salePrice: numberInput(z.number().finite().min(0, "Sale price cannot be negative")),
    reorderLevel: stockQuantityInput().optional().default(10),
    stockAlertDescription: optionalText(255),
    stockQty: stockQuantityInput().optional().default(0),
    active: booleanInput(z.boolean().optional().default(true))
});

const updateProductSchema = createProductSchema.extend({
    reorderLevel: stockQuantityInput().optional(),
    stockQty: stockQuantityInput().optional(),
    active: booleanInput(z.boolean().optional())
}).partial().refine(
    product => Object.keys(product).length > 0,
    "At least one product field must be provided"
);

const productLookupQuerySchema = z.object({
    code: z.string().min(1, "Search code or barcode is required")
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
    createUnitSchema,
    createGstRateSchema
};
