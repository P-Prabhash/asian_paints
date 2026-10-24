jest.mock("../../src/config/database", () => ({
    pool: { query: jest.fn() }
}));

const { pool } = require("../../src/config/database");
const SaleRepository = require("../../src/repositories/sale.repository");

describe("Sale repository identifier lookup", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("resolves an invoice number before attempting a numeric internal ID", async () => {
        const sale = { id: 23, invoice_no: "PNT-2026-023" };
        pool.query
            .mockResolvedValueOnce([[sale], []])
            .mockResolvedValueOnce([[{ id: 5 }], []])
            .mockResolvedValueOnce([[{ id: 6 }], []])
            .mockResolvedValueOnce([[{ id: 7 }], []]);

        const result = await SaleRepository.findByIdentifier("PNT-2026-023");

        expect(pool.query.mock.calls[0][0]).toContain("s.`invoice_no` = ?");
        expect(pool.query.mock.calls[0][1]).toEqual(["PNT-2026-023"]);
        expect(pool.query).toHaveBeenCalledTimes(4);
        expect(result).toMatchObject({ id: 23, invoice_no: "PNT-2026-023" });
    });

    test("supports legacy numeric internal sale IDs when no invoice number matches", async () => {
        const sale = { id: 23, invoice_no: "PNT-2026-023" };
        pool.query
            .mockResolvedValueOnce([[], []])
            .mockResolvedValueOnce([[sale], []])
            .mockResolvedValueOnce([[], []])
            .mockResolvedValueOnce([[], []])
            .mockResolvedValueOnce([[], []]);

        const result = await SaleRepository.findByIdentifier("23");

        expect(pool.query.mock.calls[0][1]).toEqual(["23"]);
        expect(pool.query.mock.calls[1][0]).toContain("s.`id` = ?");
        expect(pool.query.mock.calls[1][1]).toEqual([23]);
        expect(result).toMatchObject({ id: 23, invoice_no: "PNT-2026-023" });
    });
});
