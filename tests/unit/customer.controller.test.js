jest.mock("../../src/services/customer.service", () => ({
    deleteCustomer: jest.fn()
}));

const CustomerService = require("../../src/services/customer.service");
const CustomerController = require("../../src/controllers/customer.controller");

describe("Customer delete controller response", () => {
    test("returns success, a message, and the archived customer data", async () => {
        CustomerService.deleteCustomer.mockResolvedValue({
            id: 27,
            name: "Ravi Kumar",
            customerCode: "CUS-027",
            deleted: true
        });
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await CustomerController.deleteCustomer({
            params: { id: "27" },
            user: { id: 8 },
            requestId: "req-delete"
        }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: "Customer deleted successfully.",
            data: {
                id: 27,
                name: "Ravi Kumar",
                customerCode: "CUS-027",
                deleted: true
            },
            meta: { requestId: "req-delete" }
        });
    });
});
