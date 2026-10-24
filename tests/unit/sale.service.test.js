const mockConnection = {};
const mockTransaction = jest.fn(callback => callback(mockConnection));
const mockSaleRepository = {
    findByIdentifier: jest.fn(),
    getReturnedQuantitiesBySaleId: jest.fn(),
    createSaleReturn: jest.fn(),
    updateStatus: jest.fn()
};
const mockProductRepository = {
    findByIdsForUpdate: jest.fn(),
    updateStockQty: jest.fn()
};
const mockStockRepository = { addMovement: jest.fn() };
const mockCustomerRepository = {
    findByIdForUpdate: jest.fn(),
    findById: jest.fn(),
    getSaleReturnCredits: jest.fn(),
    updateBalance: jest.fn(),
    addLedgerEntry: jest.fn()
};
const mockAuditRepository = { createLog: jest.fn() };

jest.mock("../../src/utils/transaction", () => mockTransaction);
jest.mock("../../src/repositories/sale.repository", () => mockSaleRepository);
jest.mock("../../src/repositories/product.repository", () => mockProductRepository);
jest.mock("../../src/repositories/stock.repository", () => mockStockRepository);
jest.mock("../../src/repositories/customer.repository", () => mockCustomerRepository);
jest.mock("../../src/repositories/audit.repository", () => mockAuditRepository);

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
        mockSaleRepository.updateStatus.mockResolvedValue(true);
        mockProductRepository.findByIdsForUpdate.mockResolvedValue([{ id: 1, stock_qty: "4.00" }]);
        mockProductRepository.updateStockQty.mockResolvedValue(undefined);
        mockStockRepository.addMovement.mockResolvedValue(undefined);
        mockCustomerRepository.findByIdForUpdate.mockResolvedValue({ id: 9, current_balance: "50.00" });
        mockCustomerRepository.findById.mockResolvedValue({ id: 9, current_balance: "0.00" });
        mockCustomerRepository.getSaleReturnCredits.mockResolvedValue(20);
        mockCustomerRepository.updateBalance.mockResolvedValue(undefined);
        mockCustomerRepository.addLedgerEntry.mockResolvedValue(undefined);
        mockAuditRepository.createLog.mockResolvedValue(undefined);
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

    test("rejects return quantities with precision the database cannot store", async () => {
        const { saleReturnSchema } = require("../../src/validators/billing.validator");
        expect(saleReturnSchema.safeParse({
            reason: "Customer return",
            items: [{ productId: 1, qty: 0.001 }]
        }).success).toBe(false);
    });

    test("voids a sale transactionally and restores only quantities not already returned", async () => {
        mockSaleRepository.findByIdentifier.mockResolvedValue({
            id: 5,
            status: "COMPLETED",
            invoice_no: "INV-001",
            customer_id: 9,
            due_total: "50.00",
            paid_total: "50.00",
            grand_total: "100.00",
            items: [{ product_id: 1, qty: "3.00" }]
        });
        mockSaleRepository.getReturnedQuantitiesBySaleId.mockResolvedValue([
            { product_id: 1, returned_qty: "1.00", refunded_amount: "20.00" }
        ]);

        const result = await SaleService.deleteSale("INV-001", 10);

        expect(mockSaleRepository.findByIdentifier).toHaveBeenCalledWith("INV-001", mockConnection, true);
        expect(mockProductRepository.updateStockQty).toHaveBeenCalledWith(1, 6, mockConnection);
        expect(mockStockRepository.addMovement).toHaveBeenCalledWith(expect.objectContaining({
            movementType: "SALE_VOID_IN",
            qtyIn: 2,
            qtyOut: 0
        }), mockConnection);
        expect(mockSaleRepository.updateStatus).toHaveBeenCalledWith(5, "VOID", mockConnection);
        expect(mockCustomerRepository.updateBalance).toHaveBeenCalledWith(9, -30, mockConnection);
        expect(result).toMatchObject({
            saleId: 5,
            invoiceNo: "INV-001",
            status: "VOID",
            stockRestored: true,
            customerCreditReversed: 30
        });
    });

    test("does not restore stock a second time for an already voided sale", async () => {
        mockSaleRepository.findByIdentifier.mockResolvedValue({
            id: 5,
            status: "VOID",
            invoice_no: "INV-001",
            items: [{ product_id: 1, qty: 3 }]
        });

        await expect(SaleService.deleteSale("INV-001", 10))
            .rejects.toMatchObject({ code: "SALE_NOT_VOIDABLE" });
        expect(mockProductRepository.updateStockQty).not.toHaveBeenCalled();
    });
});
