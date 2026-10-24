const AppError = require("../utils/app-error");
const withTransaction = require("../utils/transaction");
const SaleRepository = require("../repositories/sale.repository");
const ProductRepository = require("../repositories/product.repository");
const StockRepository = require("../repositories/stock.repository");
const CustomerRepository = require("../repositories/customer.repository");
const AuditRepository = require("../repositories/audit.repository");
const SettingsRepository = require("../repositories/settings.repository");
const { getNextSequenceNumber } = require("../utils/invoice-number");
const { roundToTwoDecimals } = require("../utils/money");

class SaleService {
    static async listSales(options) {
        return SaleRepository.listSales(options);
    }

    static async getSaleById(id) {
        const sale = await SaleRepository.findByIdentifier(id);
        if (!sale) throw new AppError("Sale ID or invoice number not found", 404, "SALE_NOT_FOUND");
        return sale;
    }

    static async getReceiptData(id) {
        const [sale, settings] = await Promise.all([
            this.getSaleById(id),
            SettingsRepository.getAllSettings()
        ]);
        return { sale, settings };
    }

    static async processReturn(saleIdentifier, returnData, actorId) {
        return withTransaction(async (conn) => {
            const sale = await SaleRepository.findByIdentifier(saleIdentifier, conn, true);
            if (!sale) throw new AppError("Sale ID or invoice number not found", 404, "SALE_NOT_FOUND");
            const saleId = sale.id;

            if (sale.status === "VOID") {
                throw new AppError("Cannot process return on a voided invoice", 400, "INVOICE_VOIDED");
            }

            const { reason, items } = returnData;

            const saleItemMap = new Map();
            for (const item of sale.items) {
                const existing = saleItemMap.get(item.product_id);
                if (existing) {
                    existing.qty += Number(item.qty);
                    existing.line_total += Number(item.line_total);
                } else {
                    saleItemMap.set(item.product_id, {
                        ...item,
                        qty: Number(item.qty),
                        line_total: Number(item.line_total)
                    });
                }
            }
            const returnedByProduct = new Map(
                (await SaleRepository.getReturnedQuantitiesBySaleId(saleId, conn))
                    .map(item => [item.product_id, {
                        qty: Number(item.returned_qty),
                        refundAmount: Number(item.refunded_amount)
                    }])
            );
            const requestedQtyByProduct = new Map();
            const requestedRefundByProduct = new Map();

            let totalRefund = 0;
            const processedReturnItems = [];

            for (const item of items) {
                const saleItem = saleItemMap.get(item.productId);
                if (!saleItem) {
                    throw new AppError(`Product ID ${item.productId} was not part of this invoice`, 400, "PRODUCT_NOT_IN_SALE");
                }

                const priorReturns = returnedByProduct.get(item.productId) || { qty: 0, refundAmount: 0 };
                const requestedQty = (requestedQtyByProduct.get(item.productId) || 0) + item.qty;
                requestedQtyByProduct.set(item.productId, requestedQty);
                const cumulativeReturnedQty = priorReturns.qty + requestedQty;
                if (cumulativeReturnedQty > saleItem.qty) {
                    throw new AppError(`Return quantity (${cumulativeReturnedQty}) exceeds purchased quantity (${saleItem.qty}) for product '${saleItem.product_name_snapshot}'`, 400, "INVALID_RETURN_QTY");
                }

                const targetRefund = cumulativeReturnedQty === saleItem.qty
                    ? saleItem.line_total
                    : roundToTwoDecimals((saleItem.line_total / saleItem.qty) * cumulativeReturnedQty);
                const requestedRefund = requestedRefundByProduct.get(item.productId) || 0;
                const lineRefund = roundToTwoDecimals(targetRefund - priorReturns.refundAmount - requestedRefund);
                requestedRefundByProduct.set(item.productId, roundToTwoDecimals(requestedRefund + lineRefund));
                totalRefund = roundToTwoDecimals(totalRefund + lineRefund);

                processedReturnItems.push({
                    productId: item.productId,
                    productName: saleItem.product_name_snapshot,
                    qty: item.qty,
                    lineTotal: lineRefund
                });
            }

            totalRefund = roundToTwoDecimals(totalRefund);
            const returnNo = await getNextSequenceNumber(conn, "return_next_number", "RET-");

            const returnId = await SaleRepository.createSaleReturn({
                saleId,
                returnNo,
                totalRefund,
                reason,
                createdBy: actorId
            }, conn);

            for (const rItem of processedReturnItems) {
                await SaleRepository.createSaleReturnItem({
                    returnId,
                    productId: rItem.productId,
                    qty: rItem.qty,
                    refundAmount: rItem.lineTotal,
                    lineTotal: rItem.lineTotal
                }, conn);

                const lockedProducts = await ProductRepository.findByIdsForUpdate([rItem.productId], conn);
                if (lockedProducts.length > 0) {
                    const newStock = roundToTwoDecimals(Number(lockedProducts[0].stock_qty) + rItem.qty);
                    await ProductRepository.updateStockQty(rItem.productId, newStock, conn);
                }

                await StockRepository.addMovement({
                    productId: rItem.productId,
                    movementType: "SALE_RETURN_IN",
                    qtyIn: rItem.qty,
                    qtyOut: 0,
                    referenceType: "SALE_RETURN",
                    referenceId: returnNo,
                    reason: `Return for Invoice ${sale.invoice_no}: ${reason}`,
                    createdBy: actorId
                }, conn);
            }

            if (sale.customer_id && sale.due_total > 0) {
                const creditAdjustment = Math.min(sale.due_total, totalRefund);
                await CustomerRepository.updateBalance(sale.customer_id, -creditAdjustment, conn);

                const updatedCustomer = await CustomerRepository.findById(sale.customer_id, conn);

                await CustomerRepository.addLedgerEntry({
                    customerId: sale.customer_id,
                    saleId,
                    paymentId: null,
                    entryType: "SALE_RETURN",
                    debit: 0,
                    credit: creditAdjustment,
                    balanceAfter: updatedCustomer.current_balance,
                    notes: `Sales Return ${returnNo}`
                }, conn);
            }

            await AuditRepository.createLog({
                userId: actorId,
                action: "SALE_RETURN_PROCESSED",
                entityType: "SALE_RETURN",
                entityId: returnId,
                metadata: { returnNo, saleId, invoiceNo: sale.invoice_no, totalRefund }
            }, conn);

            return {
                returnId,
                returnNo,
                invoiceNo: sale.invoice_no,
                totalRefund,
                reason,
                items: processedReturnItems
            };
        });
    }
}

module.exports = SaleService;
