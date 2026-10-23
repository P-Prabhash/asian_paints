jest.mock("../../src/repositories/customer.repository", () => ({
    findByMobile: jest.fn(),
    findByCode: jest.fn(),
    createCustomer: jest.fn(),
    findById: jest.fn()
}));
jest.mock("../../src/repositories/audit.repository", () => ({
    createLog: jest.fn()
}));

const CustomerRepository = require("../../src/repositories/customer.repository");
const AuditRepository = require("../../src/repositories/audit.repository");
const CustomerService = require("../../src/services/customer.service");

describe("Customer service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        CustomerRepository.findByMobile.mockResolvedValue(null);
        CustomerRepository.findByCode.mockResolvedValue(null);
        CustomerRepository.createCustomer.mockResolvedValue(42);
        AuditRepository.createLog.mockResolvedValue(undefined);
    });

    test("returns the persisted customer record after creation", async () => {
        const customerData = {
            name: "Ravi Kumar",
            customerCode: "CUS-0001",
            mobile: "+919876543210",
            city: "Hyderabad",
            openingBalance: 1250.5,
            creditLimit: 25000
        };
        const storedCustomer = {
            id: 42,
            name: "Ravi Kumar",
            customer_code: "CUS-0001",
            mobile: "+919876543210",
            city: "Hyderabad",
            opening_balance: "1250.50",
            current_balance: "1250.50",
            credit_limit: "25000.00"
        };
        CustomerRepository.findById.mockResolvedValue(storedCustomer);

        const createdCustomer = await CustomerService.createCustomer(customerData, 7);

        expect(CustomerRepository.createCustomer).toHaveBeenCalledWith(customerData);
        expect(CustomerRepository.findById).toHaveBeenCalledWith(42);
        expect(createdCustomer).toEqual(storedCustomer);
        expect(AuditRepository.createLog).toHaveBeenCalledWith(expect.objectContaining({
            action: "CUSTOMER_CREATED",
            entityId: 42,
            metadata: {
                name: "Ravi Kumar",
                customerCode: "CUS-0001",
                mobile: "+919876543210"
            }
        }));
    });

    test("rejects duplicate customer codes", async () => {
        CustomerRepository.findByCode.mockResolvedValue({ id: 10, customer_code: "CUS-0001" });

        await expect(CustomerService.createCustomer({
            name: "Ravi Kumar",
            customerCode: "CUS-0001",
            mobile: "+919876543210"
        }, 7)).rejects.toMatchObject({
            statusCode: 409,
            code: "CUSTOMER_CODE_EXISTS"
        });
        expect(CustomerRepository.createCustomer).not.toHaveBeenCalled();
    });
});
