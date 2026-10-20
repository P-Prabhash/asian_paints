const { checkDatabaseConnection } = require("../config/database");

async function healthCheck(req, res) {
    res.status(200).json({
        success: true,
        data: {
            status: "ok",
            timestamp: new Date().toISOString()
        },
        meta: {
            requestId: req.requestId || "req-unknown"
        }
    });
}

async function readinessCheck(req, res) {
    const requestId = req.requestId || "req-unknown";

    try {
        await checkDatabaseConnection();

        return res.status(200).json({
            success: true,
            data: {
                status: "ready",
                database: "connected"
            },
            meta: {
                requestId
            }
        });
    } catch (error) {
        return res.status(503).json({
            success: false,
            error: {
                code: "SERVICE_UNAVAILABLE",
                message: "Database is unavailable",
                details: [],
                requestId
            },
            meta: {
                requestId
            }
        });
    }
}

module.exports = {
    healthCheck,
    readinessCheck
};
