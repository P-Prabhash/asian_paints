const AppError = require("../utils/app-error");
const withTransaction = require("../utils/transaction");
const StockRepository = require("../repositories/stock.repository");
const ProductRepository = require("../repositories/product.repository");
const AuditRepository = require("../repositories/audit.repository");

const MAX_STOCK_QUANTITY = 9999999999.99;

class InventoryService {
    static async listStock(options) {
        return StockRepository.listStock(options);
    }

    static async listMovements(options) {
        return StockRepository.listMovements(options);
    }

    static async adjustStock({ productId, adjustmentType, quantity, reason }, actorId) {
        return withTransaction(async (conn) => {
            const products = await ProductRepository.findByIdsForUpdate([productId], conn);
            if (products.length === 0) throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");

            const product = products[0];
            const previousStock = Number(product.stock_qty);
            let newQty = previousStock;
            let qtyIn = 0;
            let qtyOut = 0;

            if (adjustmentType === "ADD") {
                qtyIn = quantity;
                newQty = previousStock + quantity;
            } else if (adjustmentType === "REMOVE") {
                if (previousStock < quantity) {
                    throw new AppError(`Cannot reduce stock below 0. Current stock: ${previousStock}, requested removal: ${quantity}`, 400, "INSUFFICIENT_STOCK");
                }
                qtyOut = quantity;
                newQty = previousStock - quantity;
            } else if (adjustmentType === "SET") {
                if (quantity > previousStock) {
                    qtyIn = quantity - previousStock;
                } else {
                    qtyOut = previousStock - quantity;
                }
                newQty = quantity;
            }

            newQty = Math.round(newQty * 100) / 100;
            qtyIn = Math.round(qtyIn * 100) / 100;
            qtyOut = Math.round(qtyOut * 100) / 100;
            if (newQty > MAX_STOCK_QUANTITY) {
                throw new AppError("Adjusted stock exceeds the supported quantity range", 400, "STOCK_LIMIT_EXCEEDED");
            }
            await ProductRepository.updateStockQty(productId, newQty, conn);

            await StockRepository.addMovement({
                productId,
                movementType: "MANUAL_ADJUSTMENT",
                qtyIn,
                qtyOut,
                referenceType: "ADJUSTMENT",
                referenceId: null,
                reason,
                createdBy: actorId
            }, conn);

            await AuditRepository.createLog({
                userId: actorId,
                action: "STOCK_MANUAL_ADJUSTMENT",
                entityType: "STOCK",
                entityId: productId,
                metadata: { adjustmentType, quantity, previousStock, newStock: newQty, reason }
            }, conn);

            return {
                productId,
                sku: product.sku,
                productName: product.name,
                previousStock,
                newStock: newQty,
                lowStock: newQty <= Number(product.reorder_level),
                adjustmentType,
                reason
            };
        });
    }
}

module.exports = InventoryService;
