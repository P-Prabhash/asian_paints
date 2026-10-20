const crypto = require("crypto");
const env = require("../config/env");
const logger = require("../utils/logger");

function httpLogger(req, res, next) {
    const startAt = process.hrtime();
    const requestId = req.headers["x-request-id"] || `req-${crypto.randomUUID().slice(0, 8)}`;
    req.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);

    const timestamp = new Date().toISOString();

    let reqBodyLog = "[DISABLED]";
    if (env.logHttpBodies && req.body && Object.keys(req.body).length > 0) {
        reqBodyLog = JSON.stringify(logger.redactSensitiveFields(req.body));
    }

    const queryLog = req.query && Object.keys(req.query).length > 0
        ? JSON.stringify(logger.redactSensitiveFields(req.query))
        : "{}";

    if (env.nodeEnv !== "test") {
        console.log(`\n[${timestamp}] REQUEST`);
        console.log(`Request ID: ${requestId}`);
        console.log(`Method: ${req.method}`);
        console.log(`Route: ${req.originalUrl || req.url}`);
        console.log(`Query: ${queryLog}`);
        if (env.logHttpBodies) {
            console.log(`Body: ${reqBodyLog}`);
        }
    }

    const originalSend = res.send;
    let responseBody = null;

    res.send = function (content) {
        responseBody = content;
        return originalSend.apply(res, arguments);
    };

    res.on("finish", () => {
        const diff = process.hrtime(startAt);
        const durationMs = Math.round((diff[0] * 1e3) + (diff[1] * 1e-6));
        const resTimestamp = new Date().toISOString();

        let resBodyLog = "[DISABLED]";
        if (env.logHttpBodies && responseBody) {
            try {
                const parsed = typeof responseBody === "string" ? JSON.parse(responseBody) : responseBody;
                resBodyLog = JSON.stringify(logger.redactSensitiveFields(parsed));
            } catch (_) {
                resBodyLog = typeof responseBody === "string" ? responseBody.slice(0, 500) : "[UNPARSEABLE_BODY]";
            }
        }

        const userId = req.user ? req.user.id : "ANONYMOUS";

        if (env.nodeEnv !== "test") {
            console.log(`\n[${resTimestamp}] RESPONSE`);
            console.log(`Request ID: ${requestId}`);
            console.log(`User ID: ${userId}`);
            console.log(`Status: ${res.statusCode}`);
            console.log(`Duration: ${durationMs} ms`);
            if (env.logHttpBodies) {
                console.log(`Body: ${resBodyLog}`);
            }
        }
    });

    next();
}

module.exports = httpLogger;
