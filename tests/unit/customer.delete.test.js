const mockConnection = {};
const mockTransaction = jest.fn(callback => callback(mockConnection));
const mockCustomerRepository = {
    findById: jest.fn(),
    archiveCustomer: jest.fn()
};
const mockAuditRepository = { createLog: jest.fn() };

jest.mock("../../src/utils/transaction", () => mockTransaction);
jest.mock("../../src/repositories/customer.repository", () => mockCustomerRepository);
jest.mock("../../src/repositories/audit.repository", () => mockAuditRepository);

const CustomerService = require("../../src/services/customer.service");

describe("Customer soft delete", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCustomerRepository.findById.mockResolvedValue({
            id: 27,
            name: "Ravi Kumar",
            customer_code: "CUS-027",
            active: 1
        });
        mockCustomerRepository.archiveCustomer.mockResolvedValue(true);
        mockAuditRepository.createLog.mockResolvedValue(undefined);
    });

    test("archives the customer and returns a success data object", async () => {
        await expect(CustomerService.deleteCustomer(27, 8)).resolves.toEqual({
            id: 27,
            name: "Ravi Kumar",
            customerCode: "CUS-027",
            deleted: true
        });

        expect(mockCustomerRepository.findById).toHaveBeenCalledWith(27, mockConnection);
        expect(mockCustomerRepository.archiveCustomer).toHaveBeenCalledWith(27, mockConnection);
        expect(mockAuditRepository.createLog).toHaveBeenCalledWith(expect.objectContaining({
            action: "CUSTOMER_DELETED",
            entityType: "CUSTOMER",
            entityId: 27
        }), mockConnection);
    });

    test("does not delete an unknown or already archived customer", async () => {
        mockCustomerRepository.findById.mockResolvedValueOnce(null);

        await expect(CustomerService.deleteCustomer(27, 8)).rejects.toMatchObject({
            statusCode: 404,
            code: "CUSTOMER_NOT_FOUND"
        });

        expect(mockCustomerRepository.archiveCustomer).not.toHaveBeenCalled();
    });
});
