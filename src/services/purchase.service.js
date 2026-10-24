const AppError = require("../utils/app-error");
const withTransaction = require("../utils/transaction");
const PurchaseRepository = require("../repositories/purchase.repository");
const SupplierRepository = require("../repositories/supplier.repository");
const ProductRepository = require("../repositories/product.repository");
const StockRepository = require("../repositories/stock.repository");
const AuditRepository = require("../repositories/audit.repository");
const { getNextSequenceNumber } = require("../utils/invoice-number");
const { calculateLineItemTax, roundToTwoDecimals } = require("../utils/money");

const MAX_STOCK_QUANTITY = 9999999999.99;

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
            const supplierId = await this.resolveSupplier(purchaseData, actorId, conn);

            const purchaseNo = await getNextSequenceNumber(conn, "purchase_next_number", "PUR-");
            const { totals, items } = await this.prepareItems(purchaseData.items, conn);

            const purchaseId = await PurchaseRepository.createPurchase({
                purchaseNo,
                supplierId,
                supplierInvoiceNo: purchaseData.supplierInvoiceNo,
                invoiceDate: purchaseData.invoiceDate,
                ...totals,
                notes: purchaseData.notes,
                createdBy: actorId
            }, conn);

            await this.applyPurchaseItems(purchaseId, purchaseNo, items, actorId, conn, "PURCHASE_RECEIPT");

            await AuditRepository.createLog({
                userId: actorId,
                action: "PURCHASE_CREATED",
                entityType: "PURCHASE",
                entityId: purchaseId,
                metadata: { purchaseNo, supplierId, grandTotal: totals.grandTotal }
            }, conn);

            return PurchaseRepository.findById(purchaseId, conn);
        });
    }

    static async assertActiveSupplier(supplierId, conn) {
        const supplier = await SupplierRepository.findById(supplierId, conn);
        if (!supplier) throw new AppError("Supplier not found", 400, "INVALID_SUPPLIER");
        if (!supplier.active) throw new AppError("Inactive supplier cannot receive a purchase", 400, "SUPPLIER_INACTIVE");
    }

    static async resolveSupplier(purchaseData, actorId, conn) {
        if (purchaseData.supplierId) {
            await this.assertActiveSupplier(purchaseData.supplierId, conn);
            return purchaseData.supplierId;
        }

        const { supplier } = purchaseData;
        if (!supplier) {
            throw new AppError("An existing supplier ID or new supplier details are required", 400, "SUPPLIER_REQUIRED");
        }
        if (await SupplierRepository.findByCode(supplier.supplierCode, conn)) {
            throw new AppError("Supplier ID already exists; use the existing supplierId instead", 409, "SUPPLIER_CODE_EXISTS");
        }

        let supplierId;
        try {
            supplierId = await SupplierRepository.createSupplier(supplier, conn);
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
                throw new AppError("Supplier ID already exists; use the existing supplierId instead", 409, "SUPPLIER_CODE_EXISTS");
            }
            throw error;
        }

        await AuditRepository.createLog({
            userId: actorId,
            action: "SUPPLIER_CREATED",
            entityType: "SUPPLIER",
            entityId: supplierId,
            metadata: { supplierCode: supplier.supplierCode, name: supplier.name, source: "PURCHASE" }
        }, conn);
        return supplierId;
    }

    static async prepareItems(inputItems, conn, includeCurrentStock = true, lockedProducts = null) {
        const productIds = [...new Set(inputItems.map(item => item.productId))];
        const products = lockedProducts || await ProductRepository.findByIdsForUpdate(productIds, conn);
        const productMap = new Map(products.map(product => [product.id, product]));
        const stockByProduct = includeCurrentStock
            ? new Map(products.map(product => [product.id, Number(product.stock_qty)]))
            : null;
        const items = [];
        let subtotal = 0;
        let taxTotal = 0;
        let grandTotal = 0;

        for (const item of inputItems) {
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
            let newStock;
            if (stockByProduct) {
                newStock = roundToTwoDecimals(stockByProduct.get(product.id) + item.qty);
                if (newStock > MAX_STOCK_QUANTITY) {
                    throw new AppError(`Stock quantity for product ${product.id} exceeds the supported range`, 400, "STOCK_LIMIT_EXCEEDED");
                }
                stockByProduct.set(product.id, newStock);
            }
            items.push({
                productId: product.id,
                qty: item.qty,
                unitCost: item.unitCost,
                discount: calc.discount,
                taxableValue: calc.taxableValue,
                taxAmount: calc.totalTax,
                lineTotal: calc.lineTotal,
                newStock
            });
        }

        return { totals: { subtotal, taxTotal, grandTotal }, items };
    }

    static async applyPurchaseItems(purchaseId, purchaseNo, items, actorId, conn, movementType) {
        for (const item of items) {
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
                movementType,
                qtyIn: item.qty,
                qtyOut: 0,
                referenceType: "PURCHASE",
                referenceId: purchaseNo,
                reason: `${movementType === "PURCHASE_RECEIPT" ? "Purchase receipt" : "Purchase edit receipt"} ${purchaseNo}`,
                createdBy: actorId
            }, conn);
        }
    }

    static async updatePurchase(id, purchaseData, actorId) {
        return withTransaction(async conn => {
            const purchase = await PurchaseRepository.findById(id, conn, true);
            if (!purchase) throw new AppError("Purchase not found", 404, "PURCHASE_NOT_FOUND");
            if (purchase.status !== "COMPLETED") {
                throw new AppError("Only completed purchases can be edited", 409, "PURCHASE_NOT_EDITABLE");
            }

            const supplierId = await this.resolveSupplier(purchaseData, actorId, conn);
            const oldQuantities = this.aggregateQuantities(purchase.items);
            const productIds = [...new Set([
                ...oldQuantities.keys(),
                ...purchaseData.items.map(item => item.productId)
            ])].sort((a, b) => a - b);
            const products = await ProductRepository.findByIdsForUpdate(productIds, conn);
            const { totals, items } = await this.prepareItems(purchaseData.items, conn, false, products);
            const newQuantities = this.aggregateQuantities(items);
            const productMap = new Map(products.map(product => [product.id, product]));

            await PurchaseRepository.deleteItems(id, conn);
            await PurchaseRepository.updatePurchase(id, {
                supplierId,
                supplierInvoiceNo: purchaseData.supplierInvoiceNo,
                invoiceDate: purchaseData.invoiceDate,
                notes: purchaseData.notes,
                ...totals
            }, conn);

            for (const productId of productIds) {
                const product = productMap.get(productId);
                if (!product) throw new AppError(`Product ID ${productId} not found`, 400, "PRODUCT_NOT_FOUND");
                const delta = roundToTwoDecimals((newQuantities.get(productId) || 0) - (oldQuantities.get(productId) || 0));
                const newStock = roundToTwoDecimals(Number(product.stock_qty) + delta);
                if (newStock < 0) {
                    throw new AppError(`Cannot edit purchase because product ${productId} has already been consumed`, 409, "PURCHASE_STOCK_CONSUMED");
                }
                if (newStock > MAX_STOCK_QUANTITY) {
                    throw new AppError(`Stock quantity for product ${productId} exceeds the supported range`, 400, "STOCK_LIMIT_EXCEEDED");
                }
                await ProductRepository.updateStockQty(productId, newStock, conn);
                if (delta !== 0) {
                    await StockRepository.addMovement({
                        productId,
                        movementType: delta > 0 ? "PURCHASE_EDIT_IN" : "PURCHASE_EDIT_OUT",
                        qtyIn: delta > 0 ? delta : 0,
                        qtyOut: delta < 0 ? Math.abs(delta) : 0,
                        referenceType: "PURCHASE",
                        referenceId: purchase.purchase_no,
                        reason: `Purchase edit ${purchase.purchase_no}`,
                        createdBy: actorId
                    }, conn);
                }
            }

            for (const item of items) {
                await PurchaseRepository.createPurchaseItem({
                    purchaseId: id,
                    productId: item.productId,
                    qty: item.qty,
                    unitCost: item.unitCost,
                    discount: item.discount,
                    taxableValue: item.taxableValue,
                    taxAmount: item.taxAmount,
                    lineTotal: item.lineTotal
                }, conn);
            }
            await AuditRepository.createLog({
                userId: actorId,
                action: "PURCHASE_UPDATED",
                entityType: "PURCHASE",
                entityId: id,
                metadata: { purchaseNo: purchase.purchase_no, grandTotal: totals.grandTotal }
            }, conn);
            return PurchaseRepository.findById(id, conn);
        });
    }

    static async deletePurchase(id, actorId) {
        return withTransaction(async conn => {
            const purchase = await PurchaseRepository.findById(id, conn, true);
            if (!purchase) throw new AppError("Purchase not found", 404, "PURCHASE_NOT_FOUND");
            if (purchase.status !== "COMPLETED") {
                const code = purchase.status === "VOID" ? "PURCHASE_ALREADY_VOID" : "PURCHASE_NOT_VOIDABLE";
                throw new AppError("Only completed purchases can be voided", 409, code);
            }

            const quantities = this.aggregateQuantities(purchase.items);
            const products = await ProductRepository.findByIdsForUpdate([...quantities.keys()].sort((a, b) => a - b), conn);
            const productMap = new Map(products.map(product => [product.id, product]));
            for (const [productId, quantity] of quantities) {
                const product = productMap.get(productId);
                if (!product) throw new AppError(`Product ID ${productId} not found`, 400, "PRODUCT_NOT_FOUND");
                const newStock = roundToTwoDecimals(Number(product.stock_qty) - quantity);
                if (newStock < 0) {
                    throw new AppError(`Cannot void purchase: ${quantity} units of product ${productId} are no longer available`, 409, "PURCHASE_STOCK_CONSUMED");
                }
                await ProductRepository.updateStockQty(productId, newStock, conn);
                await StockRepository.addMovement({
                    productId,
                    movementType: "PURCHASE_VOID_OUT",
                    qtyIn: 0,
                    qtyOut: quantity,
                    referenceType: "PURCHASE",
                    referenceId: purchase.purchase_no,
                    reason: `Purchase void ${purchase.purchase_no}`,
                    createdBy: actorId
                }, conn);
            }
            if (!await PurchaseRepository.updateStatus(id, "VOID", conn)) {
                throw new AppError("Purchase was already voided", 409, "PURCHASE_ALREADY_VOID");
            }
            await AuditRepository.createLog({
                userId: actorId,
                action: "PURCHASE_VOIDED",
                entityType: "PURCHASE",
                entityId: id,
                metadata: { purchaseNo: purchase.purchase_no }
            }, conn);
            return {
                id,
                purchaseNo: purchase.purchase_no,
                status: "VOID",
                stockReversed: true
            };
        });
    }

    static aggregateQuantities(items) {
        const quantities = new Map();
        for (const item of items) {
            const productId = Number(item.product_id ?? item.productId);
            const quantity = Number(item.qty);
            quantities.set(productId, roundToTwoDecimals((quantities.get(productId) || 0) + quantity));
        }
        return quantities;
    }
}

module.exports = PurchaseService;
