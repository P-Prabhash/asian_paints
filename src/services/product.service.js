const AppError = require("../utils/app-error");
const ProductRepository = require("../repositories/product.repository");
const CategoryRepository = require("../repositories/category.repository");
const UnitRepository = require("../repositories/unit.repository");
const GstRateRepository = require("../repositories/gst-rate.repository");
const AuditRepository = require("../repositories/audit.repository");
const StockRepository = require("../repositories/stock.repository");
const withTransaction = require("../utils/transaction");

class ProductService {
    static async lookupByCode(code) {
        if (!code || typeof code !== "string" || code.trim().length === 0) {
            throw new AppError("Search code parameter is required", 400, "MISSING_SEARCH_CODE");
        }
        return ProductRepository.lookupByCode(code.trim());
    }

    static async listProducts(options) {
        return ProductRepository.listProducts(options);
    }

    static async getProductById(id) {
        const product = await ProductRepository.findById(id);
        if (!product) throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
        return product;
    }

    static async createProduct(productData, actorId) {
        const existingSku = await ProductRepository.findBySku(productData.sku);
        if (existingSku) throw new AppError("Product SKU already exists", 409, "SKU_EXISTS");

        if (productData.barcode) {
            const existingBarcode = await ProductRepository.findByBarcode(productData.barcode);
            if (existingBarcode) throw new AppError("Product barcode already exists", 409, "BARCODE_EXISTS");
        }

        const category = await CategoryRepository.findById(productData.categoryId);
        if (!category) throw new AppError("Invalid category ID", 400, "INVALID_CATEGORY");
        const unit = await UnitRepository.findById(productData.unitId);
        if (!unit) throw new AppError("Invalid unit ID", 400, "INVALID_UNIT");
        const gstRate = await GstRateRepository.findById(productData.gstRateId);
        if (!gstRate) throw new AppError("Invalid GST rate ID", 400, "INVALID_GST_RATE");

        let newId;
        try {
            newId = await withTransaction(async conn => {
                const productId = await ProductRepository.createProduct(productData, conn);
                const initialStock = Number(productData.stockQty ?? 0);

                if (initialStock > 0) {
                    await StockRepository.addMovement({
                        productId,
                        movementType: "INITIAL_STOCK",
                        qtyIn: initialStock,
                        referenceType: "PRODUCT",
                        referenceId: String(productId),
                        reason: "Initial stock when product was created",
                        createdBy: actorId
                    }, conn);
                }

                await AuditRepository.createLog({
                    userId: actorId,
                    action: "PRODUCT_CREATED",
                    entityType: "PRODUCT",
                    entityId: productId,
                    metadata: { sku: productData.sku, name: productData.name }
                }, conn);

                return productId;
            });
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
                throw new AppError("A product with this SKU or barcode already exists", 409, "PRODUCT_CONFLICT");
            }
            throw error;
        }

        return this.getProductById(newId);
    }

    static async updateProduct(id, updates, actorId) {
        const product = await ProductRepository.findById(id);
        if (!product) throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");

        if (updates.sku && updates.sku !== product.sku) {
            const existingSku = await ProductRepository.findBySku(updates.sku);
            if (existingSku) throw new AppError("SKU already exists", 409, "SKU_EXISTS");
        }

        if (updates.barcode && updates.barcode !== product.barcode) {
            const existingBarcode = await ProductRepository.findByBarcode(updates.barcode);
            if (existingBarcode) throw new AppError("Barcode already exists", 409, "BARCODE_EXISTS");
        }

        if (updates.categoryId !== undefined) {
            const category = await CategoryRepository.findById(updates.categoryId);
            if (!category) throw new AppError("Invalid category ID", 400, "INVALID_CATEGORY");
        }
        if (updates.unitId !== undefined) {
            const unit = await UnitRepository.findById(updates.unitId);
            if (!unit) throw new AppError("Invalid unit ID", 400, "INVALID_UNIT");
        }
        if (updates.gstRateId !== undefined) {
            const gstRate = await GstRateRepository.findById(updates.gstRateId);
            if (!gstRate) throw new AppError("Invalid GST rate ID", 400, "INVALID_GST_RATE");
        }

        try {
            await withTransaction(async conn => {
                const lockedProducts = await ProductRepository.findByIdsForUpdate([id], conn);
                if (lockedProducts.length === 0) {
                    throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
                }

                const lockedProduct = lockedProducts[0];
                const productUpdates = { ...updates };
                const requestedStock = productUpdates.stockQty;
                delete productUpdates.stockQty;

                await ProductRepository.updateProduct(id, productUpdates, conn);

                if (requestedStock !== undefined) {
                    const previousStock = Number(lockedProduct.stock_qty);
                    const quantityChange = Math.round((requestedStock - previousStock) * 100) / 100;

                    await ProductRepository.updateStockQty(id, requestedStock, conn);

                    if (quantityChange !== 0) {
                        await StockRepository.addMovement({
                            productId: id,
                            movementType: "MANUAL_ADJUSTMENT",
                            qtyIn: quantityChange > 0 ? quantityChange : 0,
                            qtyOut: quantityChange < 0 ? Math.abs(quantityChange) : 0,
                            referenceType: "PRODUCT_UPDATE",
                            referenceId: String(id),
                            reason: "Stock quantity changed while updating product details",
                            createdBy: actorId
                        }, conn);
                    }
                }

                await AuditRepository.createLog({
                    userId: actorId,
                    action: "PRODUCT_UPDATED",
                    entityType: "PRODUCT",
                    entityId: id,
                    metadata: { updatedFields: Object.keys(updates) }
                }, conn);
            });
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
                throw new AppError("A product with this SKU or barcode already exists", 409, "PRODUCT_CONFLICT");
            }
            throw error;
        }

        return this.getProductById(id);
    }

    static async listCategories() {
        return CategoryRepository.listCategories();
    }

    static async createCategory(categoryData, actorId) {
        const newId = await CategoryRepository.createCategory(categoryData);
        await AuditRepository.createLog({
            userId: actorId,
            action: "CATEGORY_CREATED",
            entityType: "CATEGORY",
            entityId: newId,
            metadata: categoryData
        });
        return CategoryRepository.findById(newId);
    }

    static async listUnits() {
        return UnitRepository.listUnits();
    }

    static async createUnit(unitData, actorId) {
        const newId = await UnitRepository.createUnit(unitData);
        await AuditRepository.createLog({
            userId: actorId,
            action: "UNIT_CREATED",
            entityType: "UNIT",
            entityId: newId,
            metadata: unitData
        });
        return UnitRepository.listUnits();
    }

    static async listGstRates() {
        return GstRateRepository.listGstRates();
    }

    static async createGstRate(gstData, actorId) {
        const newId = await GstRateRepository.createGstRate(gstData);
        await AuditRepository.createLog({
            userId: actorId,
            action: "GST_RATE_CREATED",
            entityType: "GST_RATE",
            entityId: newId,
            metadata: gstData
        });
        return GstRateRepository.listGstRates();
    }
}

module.exports = ProductService;
