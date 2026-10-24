const mockConnection = {};
const mockTransaction = jest.fn(callback => callback(mockConnection));
const mockProductRepository = {
    findByIdsForUpdate: jest.fn(),
    findByIds: jest.fn(),
    listProducts: jest.fn(),
    updateStockQty: jest.fn()
};
const mockSaleRepository = {
    createSale: jest.fn(),
    createSaleItem: jest.fn(),
    findByInvoiceNo: jest.fn()
};
const mockCustomerRepository = {
    findById: jest.fn(),
    createCustomer: jest.fn(),
    updateBalance: jest.fn(),
    addLedgerEntry: jest.fn()
};
const mockPaymentRepository = { createPayment: jest.fn() };
const mockStockRepository = { addMovement: jest.fn() };
const mockAuditRepository = { createLog: jest.fn() };
const mockIdempotencyRepository = {
    findKey: jest.fn(),
    saveKey: jest.fn()
};

jest.mock("../../src/utils/transaction", () => mockTransaction);
jest.mock("../../src/repositories/product.repository", () => mockProductRepository);
jest.mock("../../src/repositories/sale.repository", () => mockSaleRepository);
jest.mock("../../src/repositories/customer.repository", () => mockCustomerRepository);
jest.mock("../../src/repositories/payment.repository", () => mockPaymentRepository);
jest.mock("../../src/repositories/stock.repository", () => mockStockRepository);
jest.mock("../../src/repositories/audit.repository", () => mockAuditRepository);
jest.mock("../../src/repositories/idempotency.repository", () => mockIdempotencyRepository);
const BillingService = require("../../src/services/billing.service");

function createProduct(stockQty) {
    return {
        id: 1,
        stock_qty: stockQty,
        active: 1,
        name: "Interior Paint",
        sku: "PAINT-001",
        hsn_code: "32091090",
        unit_code: "L",
        sale_price: 100,
        gst_rate: 0
    };
}

describe("BillingService checkout safeguards", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockProductRepository.findByIdsForUpdate.mockResolvedValue([createProduct(5)]);
        mockSaleRepository.findByInvoiceNo.mockResolvedValue(null);
        mockSaleRepository.createSale.mockResolvedValue(51);
        mockSaleRepository.createSaleItem.mockResolvedValue(undefined);
        mockPaymentRepository.createPayment.mockResolvedValue(81);
        mockStockRepository.addMovement.mockResolvedValue(undefined);
        mockAuditRepository.createLog.mockResolvedValue(undefined);
        mockIdempotencyRepository.findKey.mockResolvedValue(null);
    });

    test.each([
        ["Paint", "PAINT", "PNT-MANUAL-001"],
        ["Sunnam Bags", "SUNNAM", "SUN-MANUAL-001"]
    ])("creates a separate %s invoice with supplied invoice number and GST-inclusive amount", async (categoryName, category, invoiceNo) => {
        mockProductRepository.findByIdsForUpdate.mockResolvedValue([{
            ...createProduct(5),
            category_name: categoryName,
            gst_rate: 18
        }]);

        const result = await BillingService.processCheckout({
            invoiceNo,
            items: [{ productId: 1, qty: 1 }],
            payments: [{ method: "CASH", amount: 118 }]
        }, 10);

        expect(mockSaleRepository.findByInvoiceNo).toHaveBeenCalledWith(invoiceNo, mockConnection);
        expect(mockSaleRepository.createSale).toHaveBeenCalledWith(expect.objectContaining({
            invoiceNo,
            categoryFilter: category,
            grandTotal: 118
        }), mockConnection);
        expect(result).toMatchObject({
            invoiceNo,
            categoryFilter: category,
            pricesIncludeGst: true,
            grandTotal: 118
        });
        expect(result.items[0]).toMatchObject({
            unitPrice: 100,
            unitPriceInclusive: 118,
            lineTotal: 118
        });
    });

    test("rejects Paint and Sunnam products in the same invoice", async () => {
        mockProductRepository.findByIdsForUpdate.mockResolvedValue([
            { ...createProduct(5), id: 1, category_name: "Paint" },
            { ...createProduct(5), id: 2, category_name: "Sunnam Bags" }
        ]);

        await expect(BillingService.processCheckout({
            invoiceNo: "MIXED-001",
            items: [
                { productId: 1, qty: 1 },
                { productId: 2, qty: 1 }
            ],
            payments: [{ method: "CASH", amount: 200 }]
        }, 10)).rejects.toMatchObject({ code: "MIXED_CATEGORY_INVOICE" });

        expect(mockSaleRepository.createSale).not.toHaveBeenCalled();
    });

    test("returns the POS catalog with GST-inclusive display prices and category filtering", async () => {
        mockProductRepository.listProducts.mockResolvedValue({
            products: [{
                id: 1,
                category_name: "Paint",
                sale_price: "100.00",
                gst_rate: "18.00"
            }],
            total: 1
        });

        const result = await BillingService.listProducts({
            categoryFilter: "PAINT",
            search: "interior",
            page: 2,
            limit: 25
        });

        expect(mockProductRepository.listProducts).toHaveBeenCalledWith({
            search: "interior",
            categoryFilter: "PAINT",
            activeOnly: true,
            limit: 25,
            offset: 25
        });
        expect(result.products[0]).toMatchObject({
            salesCategory: "PAINT",
            salePriceIncludingGst: 118
        });
    });

    test("calculates a GST-inclusive quote using current product data", async () => {
        mockProductRepository.findByIds.mockResolvedValue([{
            ...createProduct(5),
            category_name: "Paint",
            gst_rate: "18.00"
        }]);

        const result = await BillingService.calculateQuote({
            categoryFilter: "PAINT",
            items: [{ productId: 1, qty: 1 }]
        });

        expect(mockProductRepository.findByIds).toHaveBeenCalledWith([1]);
        expect(result).toMatchObject({
            categoryFilter: "PAINT",
            pricesIncludeGst: true,
            subtotal: 100,
            taxableTotal: 100,
            cgstTotal: 9,
            sgstTotal: 9,
            grandTotal: 118
        });
        expect(result.items[0]).toMatchObject({
            productId: 1,
            unitPriceInclusive: 118,
            lineTotal: 118
        });
    });

    test("rejects duplicate cart lines whose combined quantity exceeds stock", async () => {
        await expect(BillingService.processCheckout({
            invoiceNo: "STOCK-001",
            items: [
                { productId: 1, qty: 4 },
                { productId: 1, qty: 4 }
            ],
            payments: [{ method: "CASH", amount: 800 }]
        }, 10)).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });

        expect(mockProductRepository.findByIdsForUpdate).toHaveBeenCalledWith([1], mockConnection);
        expect(mockSaleRepository.createSale).not.toHaveBeenCalled();
    });

    test("rejects credit sales with mobile-only customer details", async () => {
        await expect(BillingService.processCheckout({
            invoiceNo: "CREDIT-001",
            customer: { mobile: "5551234" },
            items: [{ productId: 1, qty: 1 }],
            payments: [{ method: "CREDIT", amount: 100 }]
        }, 10)).rejects.toMatchObject({ code: "CREDIT_CUSTOMER_REQUIRED" });

        expect(mockSaleRepository.createSale).not.toHaveBeenCalled();
    });

    test("rejects a duplicate manually supplied invoice number", async () => {
        mockSaleRepository.findByInvoiceNo.mockResolvedValue({ id: 22 });

        await expect(BillingService.processCheckout({
            invoiceNo: "PNT-EXISTS",
            items: [{ productId: 1, qty: 1 }],
            payments: [{ method: "CASH", amount: 100 }]
        }, 10)).rejects.toMatchObject({
            statusCode: 409,
            code: "INVOICE_NO_EXISTS"
        });

        expect(mockSaleRepository.createSale).not.toHaveBeenCalled();
    });

    test("requires the caller to provide an invoice number", async () => {
        await expect(BillingService.processCheckout({
            items: [{ productId: 1, qty: 1 }],
            payments: [{ method: "CASH", amount: 100 }]
        }, 10)).rejects.toMatchObject({
            statusCode: 400,
            code: "INVOICE_NO_REQUIRED"
        });
    });
});
