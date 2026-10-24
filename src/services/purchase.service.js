const AppError = require("../utils/app-error");
const withTransaction = require("../utils/transaction");
const PurchaseRepository = require("../repositories/purchase.repository");
const SupplierRepository = require("../repositories/supplier.repository");
const ProductRepository = require("../repositories/product.repository");
const StockRepository = require("../repositories/stock.repository");
const AuditRepository = require("../repositories/audit.repository");
const { getNextSequenceNumber } = require("../utils/invoice-number");
const { calculateLineItemTax, roundToTwoDecimals } = require("../utils/money");

class PurchaseService {
    static async listPurchases(options) {
        return PurchaseRepository.listPurchases(options);
    }

    static async getPurchaseById(id) {
        const purchase = await PurchaseRepository.findById(id);
        if (!purchase) throw new AppError("Purchase not found", 404, "PURCHASE_NOT_FOUND");
        return purchase;
    }

    static async createPurchase(purchaseData, actorId) {
        return withTransaction(async (conn) => {
            const supplier = await SupplierRepository.findById(purchaseData.supplierId, conn);
            if (!supplier) throw new AppError("Supplier not found", 400, "INVALID_SUPPLIER");
            if (!supplier.active) throw new AppError("Inactive supplier cannot receive a purchase", 400, "SUPPLIER_INACTIVE");

            const purchaseNo = await getNextSequenceNumber(conn, "purchase_next_number", "PUR-");

            const productIds = purchaseData.items.map(i => i.productId);
            const products = await ProductRepository.findByIdsForUpdate(productIds, conn);
            const productMap = new Map(products.map(p => [p.id, p]));

            let subtotal = 0;
            let taxTotal = 0;
            let grandTotal = 0;

            const processedItems = [];
            const stockByProduct = new Map(products.map(product => [
                product.id,
                Number(product.stock_qty)
            ]));

            for (const item of purchaseData.items) {
                const product = productMap.get(item.productId);
                if (!product) throw new AppError(`Product ID ${item.productId} not found`, 400, "PRODUCT_NOT_FOUND");

                const calc = calculateLineItemTax({
                    unitPrice: item.unitCost,
                    qty: item.qty,
                    discount: item.discount || 0,
                    gstRate: item.gstRate || 0,
                    isInterState: false
                });

                subtotal = roundToTwoDecimals(subtotal + calc.taxableValue);
                taxTotal = roundToTwoDecimals(taxTotal + calc.totalTax);
                grandTotal = roundToTwoDecimals(grandTotal + calc.lineTotal);

                processedItems.push({
                    productId: item.productId,
                    qty: item.qty,
                    unitCost: item.unitCost,
                    discount: calc.discount,
                    taxableValue: calc.taxableValue,
                    taxAmount: calc.totalTax,
                    lineTotal: calc.lineTotal,
                    newStock: roundToTwoDecimals((stockByProduct.get(product.id) ?? Number(product.stock_qty)) + item.qty)
                });
                stockByProduct.set(product.id, processedItems[processedItems.length - 1].newStock);
            }

            const purchaseId = await PurchaseRepository.createPurchase({
                purchaseNo,
                supplierId: purchaseData.supplierId,
                supplierInvoiceNo: purchaseData.supplierInvoiceNo,
                invoiceDate: purchaseData.invoiceDate,
                subtotal,
                taxTotal,
                grandTotal,
                notes: purchaseData.notes,
                createdBy: actorId
            }, conn);

            for (const item of processedItems) {
                await PurchaseRepository.createPurchaseItem({
                    purchaseId,
                    productId: item.productId,
                    qty: item.qty,
                    unitCost: item.unitCost,
                    discount: item.discount,
                    taxableValue: item.taxableValue,
                    taxAmount: item.taxAmount,
                    lineTotal: item.lineTotal
                }, conn);

                await ProductRepository.updateStockQty(item.productId, item.newStock, conn);

                await StockRepository.addMovement({
                    productId: item.productId,
                    movementType: "PURCHASE_RECEIPT",
                    qtyIn: item.qty,
                    qtyOut: 0,
                    referenceType: "PURCHASE",
                    referenceId: purchaseNo,
                    reason: `Purchase receipt ${purchaseNo}`,
                    createdBy: actorId
                }, conn);
            }

            await AuditRepository.createLog({
                userId: actorId,
                action: "PURCHASE_CREATED",
                entityType: "PURCHASE",
                entityId: purchaseId,
                metadata: { purchaseNo, supplierId: purchaseData.supplierId, grandTotal }
            }, conn);

            return PurchaseRepository.findById(purchaseId, conn);
        });
    }
}

module.exports = PurchaseService;
