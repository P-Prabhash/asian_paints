const AppError = require("../utils/app-error");
const { withTransaction } = require("../config/database");
const StockRepository = require("../repositories/stock.repository");
const ProductRepository = require("../repositories/product.repository");
const AuditRepository = require("../repositories/audit.repository");

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
            let newQty = product.stock_qty;
            let qtyIn = 0;
            let qtyOut = 0;

            if (adjustmentType === "ADD") {
                qtyIn = quantity;
                newQty += quantity;
            } else if (adjustmentType === "REMOVE") {
                if (product.stock_qty < quantity) {
                    throw new AppError(`Cannot reduce stock below 0. Current stock: ${product.stock_qty}, requested removal: ${quantity}`, 400, "INSUFFICIENT_STOCK");
                }
                qtyOut = quantity;
                newQty -= quantity;
            } else if (adjustmentType === "SET") {
                if (quantity > product.stock_qty) {
                    qtyIn = quantity - product.stock_qty;
                } else {
                    qtyOut = product.stock_qty - quantity;
                }
                newQty = quantity;
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
                metadata: { adjustmentType, quantity, previousStock: product.stock_qty, newStock: newQty, reason }
            }, conn);

            return {
                productId,
                productName: product.name,
                previousStock: product.stock_qty,
                newStock: newQty,
                adjustmentType,
                reason
            };
        });
    }
}

module.exports = InventoryService;
