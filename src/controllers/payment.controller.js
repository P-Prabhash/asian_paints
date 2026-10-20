const PaymentService = require("../services/payment.service");

async function listPayments(req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const result = await PaymentService.listPayments({
        search: req.query.search,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit,
        offset
    });

    res.status(200).json({
        success: true,
        data: result.payments,
        meta: {
            requestId: req.requestId,
            pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
        }
    });
}

module.exports = {
    listPayments
};
