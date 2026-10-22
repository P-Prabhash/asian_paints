const mockConnection = {};
const mockTransaction = jest.fn(callback => callback(mockConnection));
const mockProductRepository = {
    findByIdsForUpdate: jest.fn(),
    updateStockQty: jest.fn()
};
const mockSaleRepository = {
    createSale: jest.fn(),
    createSaleItem: jest.fn()
};

jest.mock("../../src/utils/transaction", () => mockTransaction);
jest.mock("../../src/repositories/product.repository", () => mockProductRepository);
jest.mock("../../src/repositories/sale.repository", () => mockSaleRepository);

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
    });

    test("rejects duplicate cart lines whose combined quantity exceeds stock", async () => {
        await expect(BillingService.processCheckout({
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
            customer: { mobile: "5551234" },
            items: [{ productId: 1, qty: 1 }],
            payments: [{ method: "CREDIT", amount: 100 }]
        }, 10)).rejects.toMatchObject({ code: "CREDIT_CUSTOMER_REQUIRED" });

        expect(mockSaleRepository.createSale).not.toHaveBeenCalled();
    });
});
