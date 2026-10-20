const SaleService = require("../services/sale.service");

async function listSales(req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const result = await SaleService.listSales({
        search: req.query.search,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        customerId: req.query.customerId ? parseInt(req.query.customerId, 10) : undefined,
        paymentStatus: req.query.paymentStatus,
        limit,
        offset
    });

    res.status(200).json({
        success: true,
        data: result.sales,
        meta: {
            requestId: req.requestId,
            pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
        }
    });
}

async function getSale(req, res) {
    const sale = await SaleService.getSaleById(parseInt(req.params.id, 10));
    res.status(200).json({
        success: true,
        data: sale,
        meta: { requestId: req.requestId }
    });
}

async function createReturn(req, res) {
    const returnResult = await SaleService.processReturn(parseInt(req.params.id, 10), req.body, req.user.id);
    res.status(201).json({
        success: true,
        data: returnResult,
        meta: { requestId: req.requestId }
    });
}

module.exports = {
    listSales,
    getSale,
    createReturn
};
