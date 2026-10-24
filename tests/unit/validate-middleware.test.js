const validate = require("../../src/middleware/validate");
const { billingProductsQuerySchema } = require("../../src/validators/billing.validator");

describe("query validation middleware", () => {
    test("stores the Swagger billing catalog query as parsed values separately from Express query getter", () => {
        const req = {};
        Object.defineProperty(req, "query", {
            configurable: true,
            get: () => ({ categoryFilter: "PAINT", search: "12", page: "1", limit: "50" })
        });
        const next = jest.fn();

        validate(billingProductsQuerySchema, "query")(req, {}, next);

        expect(req.validatedQuery).toEqual({
            categoryFilter: "PAINT",
            search: "12",
            page: 1,
            limit: 50
        });
        expect(next).toHaveBeenCalledWith();
    });

    test("forwards a validation error for an unsupported query value", () => {
        const req = { query: { categoryFilter: "UNKNOWN" } };
        const next = jest.fn();

        validate(billingProductsQuerySchema, "query")(req, {}, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 400,
            code: "VALIDATION_ERROR"
        }));
        expect(req.validatedQuery).toBeUndefined();
    });
});
