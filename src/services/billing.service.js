const AppError = require("../utils/app-error");
const withTransaction = require("../utils/transaction");
const ProductRepository = require("../repositories/product.repository");
const CustomerRepository = require("../repositories/customer.repository");
const SaleRepository = require("../repositories/sale.repository");
const PaymentRepository = require("../repositories/payment.repository");
const StockRepository = require("../repositories/stock.repository");
const AuditRepository = require("../repositories/audit.repository");
const IdempotencyRepository = require("../repositories/idempotency.repository");
const { getNextSequenceNumber } = require("../utils/invoice-number");
const { calculateInvoiceTotals, roundToTwoDecimals } = require("../utils/money");

class BillingService {
    static async calculateQuote({ categoryFilter = "ALL", isInterState = false, items }) {
        if (!items || items.length === 0) {
            throw new AppError("Cart must contain at least one product", 400, "EMPTY_CART");
        }

        const productIds = items.map(i => i.productId);
        const [pRows] = await ProductRepository.listProducts({ limit: 1000 });
        const productMap = new Map(pRows.products.map(p => [p.id, p]));

        const itemsToCalculate = [];
        for (const item of items) {
            const product = productMap.get(item.productId);
            if (!product) {
                throw new AppError(`Product ID ${item.productId} not found`, 400, "PRODUCT_NOT_FOUND");
            }

            if (!product.active) {
                throw new AppError(`Product '${product.name}' is inactive and cannot be sold`, 400, "INACTIVE_PRODUCT");
            }

            itemsToCalculate.push({
                productId: product.id,
                name: product.name,
                sku: product.sku,
                hsnCode: product.hsn_code,
                unitCode: product.unit_code,
                unitPrice: product.sale_price,
                qty: item.qty,
                discount: item.discount || 0,
                gstRate: product.gst_rate,
                stockQty: product.stock_qty
            });
        }

        const totals = calculateInvoiceTotals(itemsToCalculate, isInterState);
        return {
            categoryFilter,
            isInterState,
            ...totals
        };
    }

    static async processCheckout(checkoutData, actorId, idempotencyKey = null) {
        const path = "/api/v1/billing/checkout";

        if (idempotencyKey) {
            const cached = await IdempotencyRepository.findKey(idempotencyKey, path);
            if (cached) {
                return cached.response_body;
            }
        }

        const result = await withTransaction(async (conn) => {
            const { categoryFilter = "ALL", isInterState = false, customer: customerInput, items, payments } = checkoutData;

            if (!items || items.length === 0) {
                throw new AppError("Cart must contain at least one product", 400, "EMPTY_CART");
            }

            if (!payments || payments.length === 0) {
                throw new AppError("At least one payment method is required", 400, "MISSING_PAYMENT");
            }

            const productIds = [...new Set(items.map(i => i.productId))];
            const lockedProducts = await ProductRepository.findByIdsForUpdate(productIds, conn);
            const productMap = new Map(lockedProducts.map(p => [p.id, p]));

            const itemsToCalculate = [];
            const requestedQtyByProduct = new Map();
            for (const item of items) {
                const product = productMap.get(item.productId);
                if (!product) {
                    throw new AppError(`Product ID ${item.productId} not found`, 400, "PRODUCT_NOT_FOUND");
                }

                if (!product.active) {
                    throw new AppError(`Product '${product.name}' is inactive`, 400, "INACTIVE_PRODUCT");
                }

                const requestedQty = (requestedQtyByProduct.get(product.id) || 0) + item.qty;
                requestedQtyByProduct.set(product.id, requestedQty);
                if (product.stock_qty < requestedQty) {
                    throw new AppError(`Insufficient stock for product '${product.name}'. Available: ${product.stock_qty}, Requested: ${requestedQty}`, 400, "INSUFFICIENT_STOCK");
                }

                itemsToCalculate.push({
                    productId: product.id,
                    name: product.name,
                    sku: product.sku,
                    hsnCode: product.hsn_code,
                    unitCode: product.unit_code,
                    unitPrice: product.sale_price,
                    qty: item.qty,
                    discount: item.discount || 0,
                    gstRate: product.gst_rate,
                    currentStock: product.stock_qty
                });
            }

            const calculatedTotals = calculateInvoiceTotals(itemsToCalculate, isInterState);

            let paidTotal = 0;
            let dueTotal = 0;

            for (const p of payments) {
                const pAmt = roundToTwoDecimals(p.amount);
                if (p.method === "CREDIT") {
                    dueTotal += pAmt;
                } else {
                    paidTotal += pAmt;
                }
            }

            paidTotal = roundToTwoDecimals(paidTotal);
            dueTotal = roundToTwoDecimals(dueTotal);

            const totalTendered = roundToTwoDecimals(paidTotal + dueTotal);
            if (totalTendered !== calculatedTotals.grandTotal) {
                throw new AppError(`Total payments (${totalTendered}) do not reconcile with grand total (${calculatedTotals.grandTotal})`, 400, "PAYMENT_MISMATCH");
            }

            let customerId = null;
            let customerObj = null;

            if (dueTotal > 0) {
                if (!customerInput || (!customerInput.id && !customerInput.name?.trim())) {
                    throw new AppError("A customer ID or customer name is required for credit sales", 400, "CREDIT_CUSTOMER_REQUIRED");
                }
            }

            if (customerInput) {
                if (customerInput.id) {
                    customerObj = await CustomerRepository.findById(customerInput.id, conn);
                    if (!customerObj) throw new AppError("Specified customer not found", 400, "CUSTOMER_NOT_FOUND");
                    customerId = customerObj.id;
                } else if (customerInput.name) {
                    customerId = await CustomerRepository.createCustomer({
                        name: customerInput.name,
                        mobile: customerInput.mobile,
                        address: customerInput.address,
                        gstin: customerInput.gstin,
                        openingBalance: 0
                    }, conn);
                    customerObj = await CustomerRepository.findById(customerId, conn);
                }
            }

            const invoiceNo = await getNextSequenceNumber(conn, "invoice_next_number", "INV-");

            let paymentStatus = "PAID";
            if (dueTotal > 0 && paidTotal > 0) paymentStatus = "PARTIAL";
            else if (dueTotal > 0 && paidTotal === 0) paymentStatus = "UNPAID";

            const saleId = await SaleRepository.createSale({
                invoiceNo,
                customerId,
                categoryFilter,
                subtotal: calculatedTotals.subtotal,
                discountTotal: calculatedTotals.discountTotal,
                taxableTotal: calculatedTotals.taxableTotal,
                cgstTotal: calculatedTotals.cgstTotal,
                sgstTotal: calculatedTotals.sgstTotal,
                igstTotal: calculatedTotals.igstTotal,
                roundOff: calculatedTotals.roundOff,
                grandTotal: calculatedTotals.grandTotal,
                paidTotal,
                dueTotal,
                paymentStatus,
                status: "COMPLETED",
                createdBy: actorId
            }, conn);

            const remainingStockByProduct = new Map(lockedProducts.map(product => [
                product.id,
                Number(product.stock_qty)
            ]));
            for (const item of calculatedTotals.items) {
                await SaleRepository.createSaleItem({
                    saleId,
                    productId: item.productId,
                    productNameSnapshot: item.name,
                    skuSnapshot: item.sku,
                    hsnSnapshot: item.hsnCode,
                    unitSnapshot: item.unitCode,
                    qty: item.qty,
                    unitPrice: item.unitPrice,
                    discount: item.discount,
                    taxRateSnapshot: item.gstRate,
                    taxableValue: item.taxableValue,
                    taxAmount: item.totalTax,
                    lineTotal: item.lineTotal
                }, conn);

                const newStock = roundToTwoDecimals(remainingStockByProduct.get(item.productId) - item.qty);
                remainingStockByProduct.set(item.productId, newStock);
                await ProductRepository.updateStockQty(item.productId, newStock, conn);

                await StockRepository.addMovement({
                    productId: item.productId,
                    movementType: "SALE_OUT",
                    qtyIn: 0,
                    qtyOut: item.qty,
                    referenceType: "SALE",
                    referenceId: invoiceNo,
                    reason: `Invoice ${invoiceNo}`,
                    createdBy: actorId
                }, conn);
            }

            for (const p of payments) {
                if (p.method !== "CREDIT" && p.amount > 0) {
                    await PaymentRepository.createPayment({
                        saleId,
                        customerId,
                        method: p.method,
                        amount: roundToTwoDecimals(p.amount),
                        referenceNo: p.referenceNo,
                        notes: `Checkout for invoice ${invoiceNo}`,
                        receivedBy: actorId
                    }, conn);
                }
            }

            if (dueTotal > 0 && customerId) {
                await CustomerRepository.updateBalance(customerId, dueTotal, conn);
                const updatedCustomer = await CustomerRepository.findById(customerId, conn);

                await CustomerRepository.addLedgerEntry({
                    customerId,
                    saleId,
                    paymentId: null,
                    entryType: "CREDIT_SALE",
                    debit: dueTotal,
                    credit: 0,
                    balanceAfter: updatedCustomer.current_balance,
                    notes: `Credit Sale Invoice ${invoiceNo}`
                }, conn);
            }

            await AuditRepository.createLog({
                userId: actorId,
                action: "INVOICE_CHECKOUT",
                entityType: "SALE",
                entityId: saleId,
                metadata: { invoiceNo, grandTotal: calculatedTotals.grandTotal, paidTotal, dueTotal }
            }, conn);

            const responseData = {
                saleId,
                invoiceNo,
                customerId,
                customerName: customerObj ? customerObj.name : "Walk-in Customer",
                categoryFilter,
                subtotal: calculatedTotals.subtotal,
                discountTotal: calculatedTotals.discountTotal,
                taxableTotal: calculatedTotals.taxableTotal,
                cgstTotal: calculatedTotals.cgstTotal,
                sgstTotal: calculatedTotals.sgstTotal,
                igstTotal: calculatedTotals.igstTotal,
                roundOff: calculatedTotals.roundOff,
                grandTotal: calculatedTotals.grandTotal,
                paidTotal,
                dueTotal,
                paymentStatus,
                items: calculatedTotals.items
            };

            if (idempotencyKey) {
                await IdempotencyRepository.saveKey({
                    key: idempotencyKey,
                    path,
                    responseCode: 201,
                    responseBody: responseData
                }, conn);
            }

            return responseData;
        });

        return result;
    }
}

module.exports = BillingService;
