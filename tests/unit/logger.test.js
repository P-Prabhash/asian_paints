const logger = require("../../src/utils/logger");

describe("Sanitized Logger Utility", () => {
    test("redacts password, token, and sensitive fields recursively", () => {
        const sensitivePayload = {
            username: "admin",
            password: "SecretPassword123",
            nested: {
                accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                creditCard: "1234-5678-9012-3456",
                normalField: "hello"
            },
            array: [
                { dbPassword: "rootpassword" },
                { safeKey: "safeValue" }
            ]
        };

        const redacted = logger.redactSensitiveFields(sensitivePayload);

        expect(redacted.username).toBe("admin");
        expect(redacted.password).toBe("[REDACTED]");
        expect(redacted.nested.accessToken).toBe("[REDACTED]");
        expect(redacted.nested.creditCard).toBe("[REDACTED]");
        expect(redacted.nested.normalField).toBe("hello");
        expect(redacted.array[0].dbPassword).toBe("[REDACTED]");
        expect(redacted.array[1].safeKey).toBe("safeValue");
    });
});
