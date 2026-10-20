require("dotenv").config();

function getRequired(name, fallback) {
    const value = process.env[name] ?? fallback;

    if (value === undefined) {
        throw new Error(`Missing environment variable: ${name}`);
    }

    return value;
}

const nodeEnv = process.env.NODE_ENV || "development";

const env = {
    nodeEnv,
    port: Number(process.env.PORT || 5000),
    apiPrefix: process.env.API_PREFIX || "/api/v1",

    dbHost: process.env.DB_HOST || "127.0.0.1",
    dbPort: Number(process.env.DB_PORT || 3306),
    dbName: process.env.DB_NAME || "paint_shop_dev",
    dbUser: process.env.DB_USER || "root",
    dbPassword: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "",

    jwtSecret: process.env.JWT_SECRET || (nodeEnv === "test" ? "test_secret_key_at_least_32_characters_long_123456" : "default_jwt_secret_key_for_development_mode_only_32_chars"),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",

    corsOrigin: process.env.CORS_ORIGIN || "*",

    rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX || "100"),

    logLevel: process.env.LOG_LEVEL || "debug",
    logHttpBodies: (process.env.LOG_HTTP_BODIES ?? "true") === "true",
    swaggerEnabled: (process.env.SWAGGER_ENABLED ?? "true") === "true"
};

if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
    throw new Error("PORT must be a valid port number (1-65535).");
}

if (!Number.isInteger(env.dbPort) || env.dbPort < 1 || env.dbPort > 65535) {
    throw new Error("DB_PORT must be a valid port number (1-65535).");
}

if (env.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters for security.");
}

module.exports = Object.freeze(env);
