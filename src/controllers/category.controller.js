const ProductService = require("../services/product.service");

async function listCategories(req, res) {
    const categories = await ProductService.listCategories();
    res.status(200).json({
        success: true,
        data: categories,
        meta: { requestId: req.requestId }
    });
}

async function createCategory(req, res) {
    const category = await ProductService.createCategory(req.body, req.user.id);
    res.status(201).json({
        success: true,
        data: category,
        meta: { requestId: req.requestId }
    });
}

async function listUnits(req, res) {
    const units = await ProductService.listUnits();
    res.status(200).json({
        success: true,
        data: units,
        meta: { requestId: req.requestId }
    });
}

async function createUnit(req, res) {
    const units = await ProductService.createUnit(req.body, req.user.id);
    res.status(201).json({
        success: true,
        data: units,
        meta: { requestId: req.requestId }
    });
}

async function listGstRates(req, res) {
    const gstRates = await ProductService.listGstRates();
    res.status(200).json({
        success: true,
        data: gstRates,
        meta: { requestId: req.requestId }
    });
}

async function createGstRate(req, res) {
    const gstRates = await ProductService.createGstRate(req.body, req.user.id);
    res.status(201).json({
        success: true,
        data: gstRates,
        meta: { requestId: req.requestId }
    });
}

module.exports = {
    listCategories,
    createCategory,
    listUnits,
    createUnit,
    listGstRates,
    createGstRate
};
