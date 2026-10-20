const BillingService = require("../services/billing.service");

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
    quote,
    checkout
};
