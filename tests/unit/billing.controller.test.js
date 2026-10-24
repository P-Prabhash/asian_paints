jest.mock("../../src/services/billing.service", () => ({
    listProducts: jest.fn(),
    calculateQuote: jest.fn(),
    processCheckout: jest.fn()
}));

const BillingService = require("../../src/services/billing.service");
const BillingController = require("../../src/controllers/billing.controller");

function createResponse() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
}

describe("Billing controller success responses", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns success true and pagination for billing products", async () => {
        BillingService.listProducts.mockResolvedValue({
            products: [{ id: 7, name: "Paint", salePriceIncludingGst: 118 }],
            total: 1
        });
        const req = {
            validatedQuery: { categoryFilter: "PAINT", page: 2, limit: 25 },
            requestId: "req-test"
        };
        const res = createResponse();

        await BillingController.listProducts(req, res);

        expect(BillingService.listProducts).toHaveBeenCalledWith({
            categoryFilter: "PAINT",
            page: 2,
            limit: 25
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: [{ id: 7, name: "Paint", salePriceIncludingGst: 118 }],
            meta: {
                requestId: "req-test",
                pagination: { page: 2, limit: 25, total: 1, totalPages: 1 }
            }
        });
    });

    test("returns success true with quote data", async () => {
        const quote = { grandTotal: 118, pricesIncludeGst: true };
        BillingService.calculateQuote.mockResolvedValue(quote);
        const res = createResponse();

        await BillingController.quote({
            body: { items: [{ productId: 7, qty: 1 }] },
            requestId: "req-quote"
        }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: quote,
            meta: { requestId: "req-quote" }
        });
    });

    test("returns success true with checkout invoice data", async () => {
        const invoice = { invoiceNo: "PNT-1001", grandTotal: 118 };
        BillingService.processCheckout.mockResolvedValue(invoice);
        const req = {
            body: { items: [{ productId: 7, qty: 1 }] },
            headers: {},
            user: { id: 3 },
            requestId: "req-checkout"
        };
        const res = createResponse();

        await BillingController.checkout(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: invoice,
            meta: { requestId: "req-checkout" }
        });
    });

    test("propagates failed service operations instead of returning false-shaped data", async () => {
        const failure = new Error("database unavailable");
        BillingService.calculateQuote.mockRejectedValue(failure);

        await expect(BillingController.quote({ body: {}, requestId: "req-fail" }, createResponse()))
            .rejects.toBe(failure);
    });
});
