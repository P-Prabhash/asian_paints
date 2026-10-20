const PurchaseService = require("../services/purchase.service");

async function listPurchases(req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const result = await PurchaseService.listPurchases({ search: req.query.search, limit, offset });
    res.status(200).json({
        success: true,
        data: result.purchases,
        meta: {
            requestId: req.requestId,
            pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
        }
    });
}

async function getPurchase(req, res) {
    const purchase = await PurchaseService.getPurchaseById(parseInt(req.params.id, 10));
    res.status(200).json({
        success: true,
        data: purchase,
        meta: { requestId: req.requestId }
    });
}

async function createPurchase(req, res) {
    const purchase = await PurchaseService.createPurchase(req.body, req.user.id);
    res.status(201).json({
        success: true,
        data: purchase,
        meta: { requestId: req.requestId }
    });
}

module.exports = {
    listPurchases,
    getPurchase,
    createPurchase
};
