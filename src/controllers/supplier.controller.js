const SupplierService = require("../services/supplier.service");

async function listSuppliers(req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const result = await SupplierService.listSuppliers({ search: req.query.search, limit, offset });
    res.status(200).json({
        success: true,
        data: result.suppliers,
        meta: {
            requestId: req.requestId,
            pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
        }
    });
}

async function getSupplier(req, res) {
    const supplier = await SupplierService.getSupplierById(parseInt(req.params.id, 10));
    res.status(200).json({
        success: true,
        data: supplier,
        meta: { requestId: req.requestId }
    });
}

async function createSupplier(req, res) {
    const supplier = await SupplierService.createSupplier(req.body, req.user.id);
    res.status(201).json({
        success: true,
        data: supplier,
        meta: { requestId: req.requestId }
    });
}

async function updateSupplier(req, res) {
    const supplier = await SupplierService.updateSupplier(parseInt(req.params.id, 10), req.body, req.user.id);
    res.status(200).json({
        success: true,
        data: supplier,
        meta: { requestId: req.requestId }
    });
}

module.exports = {
    listSuppliers,
    getSupplier,
    createSupplier,
    updateSupplier
};
