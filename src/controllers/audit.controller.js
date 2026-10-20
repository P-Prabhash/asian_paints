const AuditService = require("../services/audit.service");

async function listAuditLogs(req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const result = await AuditService.listLogs({
        userId: req.query.userId ? parseInt(req.query.userId, 10) : undefined,
        action: req.query.action,
        limit,
        offset
    });

    res.status(200).json({
        success: true,
        data: result.logs,
        meta: {
            requestId: req.requestId,
            pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
        }
    });
}

module.exports = {
    listAuditLogs
};
