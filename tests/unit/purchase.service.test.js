const mockConnection = {};
const mockTransaction = jest.fn(callback => callback(mockConnection));
const mockPurchaseRepository = {
    createPurchase: jest.fn(),
    createPurchaseItem: jest.fn(),
    findById: jest.fn(),
    deleteItems: jest.fn(),
    updatePurchase: jest.fn(),
    updateStatus: jest.fn()
};
const mockSupplierRepository = { findById: jest.fn() };
const mockProductRepository = {
    findByIdsForUpdate: jest.fn(),
    updateStockQty: jest.fn()
};
const mockStockRepository = { addMovement: jest.fn() };
const mockAuditRepository = { createLog: jest.fn() };
const mockGetNextSequenceNumber = jest.fn();

jest.mock("../../src/utils/transaction", () => mockTransaction);
jest.mock("../../src/repositories/purchase.repository", () => mockPurchaseRepository);
jest.mock("../../src/repositories/supplier.repository", () => mockSupplierRepository);
jest.mock("../../src/repositories/product.repository", () => mockProductRepository);
jest.mock("../../src/repositories/stock.repository", () => mockStockRepository);
jest.mock("../../src/repositories/audit.repository", () => mockAuditRepository);
jest.mock("../../src/utils/invoice-number", () => ({
    getNextSequenceNumber: mockGetNextSequenceNumber
}));

const PurchaseService = require("../../src/services/purchase.service");

describe("Purchase creation transaction", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSupplierRepository.findById.mockResolvedValue({ id: 3, active: 1 });
        mockGetNextSequenceNumber.mockResolvedValue("PUR-1001");
        mockProductRepository.findByIdsForUpdate.mockResolvedValue([{
            id: 12,
            stock_qty: "8.00"
        }]);
        mockPurchaseRepository.createPurchase.mockResolvedValue(44);
        mockPurchaseRepository.createPurchaseItem.mockResolvedValue(undefined);
        mockPurchaseRepository.updatePurchase.mockResolvedValue(true);
        mockPurchaseRepository.updateStatus.mockResolvedValue(true);
        mockProductRepository.updateStockQty.mockResolvedValue(undefined);
        mockStockRepository.addMovement.mockResolvedValue(undefined);
        mockAuditRepository.createLog.mockResolvedValue(undefined);
        mockPurchaseRepository.findById.mockResolvedValue({
            id: 44,
            purchase_no: "PUR-1001",
            items: [{ product_id: 12, qty: "5.00" }]
        });
    });

    test("persists and reads the created purchase in the transaction and returns it", async () => {
        const result = await PurchaseService.createPurchase({
            supplierId: 3,
            invoiceDate: "2026-10-24",
            items: [{ productId: 12, qty: 5, unitCost: 100, gstRate: 18 }]
        }, 7);

        expect(mockSupplierRepository.findById).toHaveBeenCalledWith(3, mockConnection);
        expect(mockPurchaseRepository.createPurchase).toHaveBeenCalledWith(expect.objectContaining({
            purchaseNo: "PUR-1001",
            supplierId: 3,
            grandTotal: 590
        }), mockConnection);
        expect(mockProductRepository.updateStockQty).toHaveBeenCalledWith(12, 13, mockConnection);
        expect(mockPurchaseRepository.findById).toHaveBeenCalledWith(44, mockConnection);
        expect(result).toEqual({
            id: 44,
            purchase_no: "PUR-1001",
            items: [{ product_id: 12, qty: "5.00" }]
        });
    });

    test("adds repeated product lines cumulatively to stock", async () => {
        await PurchaseService.createPurchase({
            supplierId: 3,
            invoiceDate: "2026-10-24",
            items: [
                { productId: 12, qty: 2, unitCost: 100 },
                { productId: 12, qty: 3, unitCost: 100 }
            ]
        }, 7);

        expect(mockProductRepository.updateStockQty).toHaveBeenNthCalledWith(1, 12, 10, mockConnection);
        expect(mockProductRepository.updateStockQty).toHaveBeenNthCalledWith(2, 12, 13, mockConnection);
    });

    test("edits purchase items and applies only the stock quantity difference", async () => {
        mockPurchaseRepository.findById
            .mockResolvedValueOnce({
                id: 44,
                purchase_no: "PUR-1001",
                status: "COMPLETED",
                items: [{ product_id: 12, qty: "4.00" }]
            })
            .mockResolvedValueOnce({ id: 44, purchase_no: "PUR-1001", items: [{ product_id: 12, qty: "6.00" }] });

        const result = await PurchaseService.updatePurchase(44, {
            supplierId: 3,
            invoiceDate: "2026-10-25",
            items: [{ productId: 12, qty: 6, unitCost: 100 }]
        }, 7);

        expect(mockPurchaseRepository.deleteItems).toHaveBeenCalledWith(44, mockConnection);
        expect(mockPurchaseRepository.updatePurchase).toHaveBeenCalledWith(44, expect.objectContaining({
            supplierId: 3,
            grandTotal: 600
        }), mockConnection);
        expect(mockProductRepository.updateStockQty).toHaveBeenCalledWith(12, 10, mockConnection);
        expect(mockStockRepository.addMovement).toHaveBeenCalledWith(expect.objectContaining({
            movementType: "PURCHASE_EDIT_IN",
            qtyIn: 2,
            qtyOut: 0
        }), mockConnection);
        expect(result.items).toHaveLength(1);
    });

    test("voids a purchase, reverses received stock, and retains the purchase record", async () => {
        mockPurchaseRepository.findById.mockResolvedValue({
            id: 44,
            purchase_no: "PUR-1001",
            status: "COMPLETED",
            items: [{ product_id: 12, qty: "5.00" }]
        });

        const result = await PurchaseService.deletePurchase(44, 7);

        expect(mockProductRepository.updateStockQty).toHaveBeenCalledWith(12, 3, mockConnection);
        expect(mockStockRepository.addMovement).toHaveBeenCalledWith(expect.objectContaining({
            movementType: "PURCHASE_VOID_OUT",
            qtyIn: 0,
            qtyOut: 5
        }), mockConnection);
        expect(mockPurchaseRepository.updateStatus).toHaveBeenCalledWith(44, "VOID", mockConnection);
        expect(result).toMatchObject({ id: 44, status: "VOID", stockReversed: true });
    });
});
