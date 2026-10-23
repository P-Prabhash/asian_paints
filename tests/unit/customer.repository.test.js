jest.mock("../../src/config/database", () => ({
    pool: { query: jest.fn() }
}));

const { pool } = require("../../src/config/database");
const CustomerRepository = require("../../src/repositories/customer.repository");

describe("Customer repository", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("persists all customer details and initializes current balance", async () => {
        pool.query.mockResolvedValue([{ insertId: 42 }, []]);

        const customerData = {
            name: "Ravi Kumar",
            customerCode: "CUS-0001",
            mobile: "+919876543210",
            alternatePhone: "04012345678",
            email: "ravi@example.com",
            addressLine: "12 Main Road",
            city: "Hyderabad",
            state: "Telangana",
            pinCode: "500001",
            country: "India",
            gstin: "36ABCDE1234F1Z5",
            pan: "ABCDE1234F",
            customerType: "BUSINESS",
            openingBalance: 1250.5,
            creditLimit: 25000,
            paymentTerms: "Net 30 days",
            notes: "Preferred delivery in the morning",
            active: true
        };

        const customerId = await CustomerRepository.createCustomer(customerData);

        expect(customerId).toBe(42);
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("`customer_code`"), [
            "Ravi Kumar",
            "CUS-0001",
            "+919876543210",
            "04012345678",
            "ravi@example.com",
            "12 Main Road",
            "12 Main Road",
            "Hyderabad",
            "Telangana",
            "500001",
            "India",
            "36ABCDE1234F1Z5",
            "ABCDE1234F",
            "BUSINESS",
            1250.5,
            1250.5,
            25000,
            "Net 30 days",
            "Preferred delivery in the morning",
            1
        ]);
    });
});
