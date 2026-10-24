jest.mock("../../src/config/env", () => ({ nodeEnv: "development" }));

const errorHandler = require("../../src/middleware/error-handler");

describe("API error handler", () => {
    test("returns a safe database error instead of raw SQL details", () => {
        const res = {
            headersSent: false,
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        const originalConsoleError = console.error;
        console.error = jest.fn();
        try {
            errorHandler({
                code: "ER_PARSE_ERROR",
                message: "SQL syntax error near LIMIT '50' OFFSET 0"
            }, { requestId: "req-database" }, res, jest.fn());
        } finally {
            console.error = originalConsoleError;
        }

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                code: "DATABASE_ERROR",
                message: "A database operation failed.",
                details: [],
                requestId: "req-database"
            }
        });
    });
});
