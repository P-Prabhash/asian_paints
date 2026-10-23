const BillingService = require("../services/billing.service");

async function listProducts(req, res) {
    const result = await BillingService.listProducts(req.query);
    res.status(200).json({
        success: true,
        data: result.products,
        meta: {
            requestId: req.requestId,
            pagination: {
                page: req.query.page,
                limit: req.query.limit,
                total: result.total,
                totalPages: Math.ceil(result.total / req.query.limit)
            }
        }
    });
}

async function quote(req, res) {
    const quoteResult = await BillingService.calculateQuote(req.body);
    res.status(200).json({
        success: true,
        data: quoteResult,
        meta: { requestId: req.requestId }
    });
}

async function checkout(req, res) {
    const idempotencyKey = req.headers["idempotency-key"] || req.body.idempotencyKey || null;
    const checkoutResult = await BillingService.processCheckout(req.body, req.user.id, idempotencyKey);
    res.status(201).json({
        success: true,
        data: checkoutResult,
        meta: { requestId: req.requestId }
    });
}

module.exports = {
    listProducts,
    quote,
    checkout
};
