const mockConnection = {};
const mockTransaction = jest.fn(callback => callback(mockConnection));
const mockSaleRepository = {
    findByIdentifier: jest.fn(),
    getReturnedQuantitiesBySaleId: jest.fn(),
    createSaleReturn: jest.fn()
};

jest.mock("../../src/utils/transaction", () => mockTransaction);
jest.mock("../../src/repositories/sale.repository", () => mockSaleRepository);

const SaleService = require("../../src/services/sale.service");

describe("SaleService return safeguards", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSaleRepository.findByIdentifier.mockResolvedValue({
            id: 5,
            status: "COMPLETED",
            invoice_no: "INV-001",
            due_total: 0,
            items: [{
                product_id: 1,
                product_name_snapshot: "Interior Paint",
                qty: 1,
                line_total: 100
            }]
        });
        mockSaleRepository.getReturnedQuantitiesBySaleId.mockResolvedValue([]);
    });

    test("rejects duplicate return lines exceeding the sold quantity", async () => {
        await expect(SaleService.processReturn(5, {
            reason: "Customer return",
            items: [
                { productId: 1, qty: 1 },
                { productId: 1, qty: 1 }
            ]
        }, 10)).rejects.toMatchObject({ code: "INVALID_RETURN_QTY" });

        expect(mockSaleRepository.findByIdentifier).toHaveBeenCalledWith(5, mockConnection, true);
        expect(mockSaleRepository.createSaleReturn).not.toHaveBeenCalled();
    });

    test("rejects quantities already returned on an earlier request", async () => {
        mockSaleRepository.findByIdentifier.mockResolvedValue({
            id: 5,
            status: "COMPLETED",
            invoice_no: "INV-001",
            due_total: 0,
            items: [{
                product_id: 1,
                product_name_snapshot: "Interior Paint",
                qty: 2,
                line_total: 200
            }]
        });
        mockSaleRepository.getReturnedQuantitiesBySaleId.mockResolvedValue([{
            product_id: 1,
            returned_qty: 1,
            refunded_amount: 100
        }]);

        await expect(SaleService.processReturn(5, {
            reason: "Customer return",
            items: [{ productId: 1, qty: 2 }]
        }, 10)).rejects.toMatchObject({ code: "INVALID_RETURN_QTY" });

        expect(mockSaleRepository.createSaleReturn).not.toHaveBeenCalled();
    });
});
