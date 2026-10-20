const rateLimit = require("express-rate-limit");
const env = require("../config/env");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.nodeEnv === "test" ? 1000 : 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many login attempts. Please try again later."
        }
    }
});

const apiLimiter = rateLimit({
    windowMs: env.rateLimitWindowMs || 15 * 60 * 1000,
    limit: env.nodeEnv === "test" ? 10000 : (env.rateLimitMax || 100),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later."
        }
    }
});

module.exports = {
    loginLimiter,
    apiLimiter
};
