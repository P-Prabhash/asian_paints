const env = require("../config/env");

function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    const isDatabaseError = typeof err.code === "string" && (
        err.code.startsWith("ER_") ||
        ["ECONNREFUSED", "PROTOCOL_CONNECTION_LOST", "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR"].includes(err.code)
    );
    const statusCode = Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 600
        ? err.statusCode
        : 500;

    const errorCode = isDatabaseError
        ? "DATABASE_ERROR"
        : err.code || (statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR");
    const message = isDatabaseError
        ? "A database operation failed."
        : statusCode >= 500 && env.nodeEnv === "production"
            ? "An unexpected server error occurred."
            : (err.message || "An error occurred");

    const requestId = req.requestId || err.requestId || "req-unknown";

    if (statusCode >= 500) {
        console.error(`[ERROR] ${err.stack || err.message}`);
    }

    res.status(statusCode).json({
        success: false,
        error: {
            code: errorCode,
            message,
            details: err.details || [],
            requestId
        }
    });
}

module.exports = errorHandler;
