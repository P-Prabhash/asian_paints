const InventoryService = require("../services/inventory.service");

async function listStock(req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const result = await InventoryService.listStock({
        search: req.query.search,
        categoryId: req.query.categoryId ? parseInt(req.query.categoryId, 10) : undefined,
        lowStockOnly: req.query.lowStock === "true",
        limit,
        offset
    });

    res.status(200).json({
        success: true,
        data: result.stock,
        meta: {
            requestId: req.requestId,
            pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
        }
    });
}

async function listMovements(req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const result = await InventoryService.listMovements({
        productId: req.query.productId ? parseInt(req.query.productId, 10) : undefined,
        movementType: req.query.movementType,
        limit,
        offset
    });

    res.status(200).json({
        success: true,
        data: result.movements,
        meta: {
            requestId: req.requestId,
            pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
        }
    });
}

async function adjustStock(req, res) {
    const adjustment = await InventoryService.adjustStock(req.body, req.user.id);
    res.status(200).json({
        success: true,
        data: adjustment,
        meta: { requestId: req.requestId }
    });
}

module.exports = {
    listStock,
    listMovements,
    adjustStock
};
