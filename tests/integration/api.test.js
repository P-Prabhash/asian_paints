const request = require("supertest");
const app = require("../../src/app");

describe("API Integration Tests", () => {
    test("GET /api/v1/health/live returns status 200 and standard response format", async () => {
        const res = await request(app).get("/api/v1/health/live");

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("ok");
        expect(res.body.meta.requestId).toBeDefined();
    });

    test("GET /api/v1/health/ready checks database connection and returns status", async () => {
        const res = await request(app).get("/api/v1/health/ready");
        expect([200, 503]).toContain(res.statusCode);
        expect(res.body.meta.requestId).toBeDefined();
    });

    test("Non-existent route returns standard HTTP 404 response", async () => {
        const res = await request(app).get("/api/v1/non-existent-route");

        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
        expect(res.body.error.requestId).toBeDefined();
    });

    test("POST /api/v1/auth/login invalid payload returns HTTP 400 validation error", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({});

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
        expect(Array.isArray(res.body.error.details)).toBe(true);
    });

    test("Protected endpoint without Bearer token returns HTTP 401 UNAUTHENTICATED", async () => {
        const res = await request(app).get("/api/v1/products");

        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });
});
