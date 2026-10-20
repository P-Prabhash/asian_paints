const env = require("../config/env");

function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    const statusCode = Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 600
        ? err.statusCode
        : 500;

    const errorCode = err.code || (statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR");
    const message = statusCode >= 500 && env.nodeEnv === "production"
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
