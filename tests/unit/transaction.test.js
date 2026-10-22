const mockConnection = {
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn()
};
const mockPool = {
    getConnection: jest.fn()
};

jest.mock("../../src/config/database", () => ({ pool: mockPool }));

const withTransaction = require("../../src/utils/transaction");

describe("withTransaction", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPool.getConnection.mockResolvedValue(mockConnection);
    });

    test("commits successful callbacks and releases the connection", async () => {
        const callback = jest.fn().mockResolvedValue("result");

        await expect(withTransaction(callback)).resolves.toBe("result");

        expect(callback).toHaveBeenCalledWith(mockConnection);
        expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
        expect(mockConnection.commit).toHaveBeenCalledTimes(1);
        expect(mockConnection.rollback).not.toHaveBeenCalled();
        expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });

    test("rolls back failed callbacks and releases the connection", async () => {
        const error = new Error("database operation failed");

        await expect(withTransaction(() => {
            throw error;
        })).rejects.toBe(error);

        expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
        expect(mockConnection.commit).not.toHaveBeenCalled();
        expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });
});
