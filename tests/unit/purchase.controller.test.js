jest.mock("../../src/services/purchase.service", () => ({
    createPurchase: jest.fn()
}));

const PurchaseService = require("../../src/services/purchase.service");
const PurchaseController = require("../../src/controllers/purchase.controller");

describe("Purchase creation controller response", () => {
    test("returns success and the persisted purchase details", async () => {
        const purchase = {
            id: 44,
            purchase_no: "PUR-1001",
            supplier_name: "Trusted Supplier",
            items: [{ product_id: 12, qty: "5.00" }]
        };
        PurchaseService.createPurchase.mockResolvedValue(purchase);
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await PurchaseController.createPurchase({
            body: { supplierId: 3, items: [] },
            user: { id: 7 },
            requestId: "req-purchase"
        }, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: purchase,
            meta: { requestId: "req-purchase" }
        });
    });
});
