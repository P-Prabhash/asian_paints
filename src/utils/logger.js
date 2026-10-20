const env = require("../config/env");

const SENSITIVE_KEYS = new Set([
    "password", "password_hash", "token", "accesstoken", "refreshtoken",
    "authorization", "secret", "dbpassword", "cookie", "aadhaar", "pan",
    "creditcard", "cvv", "jwtsecret", "sessionsecret", "privatekey"
]);

function redactSensitiveFields(obj) {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj !== "object") {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => redactSensitiveFields(item));
    }

    const redacted = {};
    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (SENSITIVE_KEYS.has(lowerKey)) {
            redacted[key] = "[REDACTED]";
        } else if (typeof value === "object" && value !== null) {
            redacted[key] = redactSensitiveFields(value);
        } else {
            redacted[key] = value;
        }
    }
    return redacted;
}

function formatLogMessage(level, message, meta = null) {
    const timestamp = new Date().toISOString();
    let metaString = "";
    if (meta) {
        const sanitized = redactSensitiveFields(meta);
        metaString = " " + JSON.stringify(sanitized);
    }
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
}

const logger = {
    info(message, meta) {
        console.log(formatLogMessage("info", message, meta));
    },
    error(message, meta) {
        console.error(formatLogMessage("error", message, meta));
    },
    warn(message, meta) {
        console.warn(formatLogMessage("warn", message, meta));
    },
    debug(message, meta) {
        if (env.logLevel === "debug") {
            console.log(formatLogMessage("debug", message, meta));
        }
    },
    redactSensitiveFields
};

module.exports = logger;
