const BillingService = require("../services/billing.service");

async function listProducts(req, res) {
    const query = req.validatedQuery || req.query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const result = await BillingService.listProducts({ ...query, page, limit });
    res.status(200).json({
        success: true,
        data: result.products,
        meta: {
            requestId: req.requestId,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
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
