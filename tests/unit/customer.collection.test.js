const mockConnection = {};
const mockTransaction = jest.fn(callback => callback(mockConnection));
const mockCustomerRepository = {
    findById: jest.fn(),
    updateBalance: jest.fn(),
    addLedgerEntry: jest.fn()
};
const mockPaymentRepository = {
    findCollectionReceiptByNo: jest.fn(),
    createPayment: jest.fn(),
    createCollectionReceipt: jest.fn()
};
const mockAuditRepository = { createLog: jest.fn() };

jest.mock("../../src/utils/transaction", () => mockTransaction);
jest.mock("../../src/repositories/customer.repository", () => mockCustomerRepository);
jest.mock("../../src/repositories/payment.repository", () => mockPaymentRepository);
jest.mock("../../src/repositories/audit.repository", () => mockAuditRepository);

const CustomerService = require("../../src/services/customer.service");

describe("Customer payment collection receipt numbers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCustomerRepository.findById
            .mockResolvedValueOnce({
                id: 9,
                name: "Ravi Kumar",
                current_balance: "500.00",
                active: 1
            })
            .mockResolvedValueOnce({
                id: 9,
                name: "Ravi Kumar",
                current_balance: "250.00",
                active: 1
            });
        mockPaymentRepository.findCollectionReceiptByNo.mockResolvedValue(null);
        mockPaymentRepository.createPayment.mockResolvedValue(32);
        mockPaymentRepository.createCollectionReceipt.mockResolvedValue(45);
        mockCustomerRepository.updateBalance.mockResolvedValue(undefined);
        mockCustomerRepository.addLedgerEntry.mockResolvedValue(undefined);
        mockAuditRepository.createLog.mockResolvedValue(undefined);
    });

    test("creates a collection receipt using the caller-supplied number", async () => {
        const result = await CustomerService.collectPayment(9, {
            receiptNo: "REC-MANUAL-009",
            amount: 250,
            paymentMethod: "CASH"
        }, 4);

        expect(mockPaymentRepository.createCollectionReceipt).toHaveBeenCalledWith(
            expect.objectContaining({ receiptNo: "REC-MANUAL-009" }),
            mockConnection
        );
        expect(result).toEqual({
            receiptId: 45,
            receiptNo: "REC-MANUAL-009",
            customerId: 9,
            customerName: "Ravi Kumar",
            amountCollected: 250,
            previousBalance: "500.00",
            newBalance: "250.00"
        });
    });

    test("rejects duplicate caller-supplied receipt numbers before recording payment", async () => {
        mockPaymentRepository.findCollectionReceiptByNo.mockResolvedValue({ id: 11 });

        await expect(CustomerService.collectPayment(9, {
            receiptNo: "REC-EXISTS",
            amount: 250,
            paymentMethod: "CASH"
        }, 4)).rejects.toMatchObject({
            statusCode: 409,
            code: "RECEIPT_NO_EXISTS"
        });

        expect(mockPaymentRepository.createPayment).not.toHaveBeenCalled();
    });
});
