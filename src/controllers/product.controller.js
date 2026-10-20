const ProductService = require("../services/product.service");

async function lookupProduct(req, res) {
    const products = await ProductService.lookupByCode(req.query.code);
    res.status(200).json({
        success: true,
        data: products,
        meta: { requestId: req.requestId }
    });
}

async function listProducts(req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const result = await ProductService.listProducts({
        search: req.query.search,
        categoryId: req.query.categoryId ? parseInt(req.query.categoryId, 10) : undefined,
        activeOnly: req.query.activeOnly === "true",
        limit,
        offset
    });

    res.status(200).json({
        success: true,
        data: result.products,
        meta: {
            requestId: req.requestId,
            pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
        }
    });
}

async function getProduct(req, res) {
    const product = await ProductService.getProductById(parseInt(req.params.id, 10));
    res.status(200).json({
        success: true,
        data: product,
        meta: { requestId: req.requestId }
    });
}

async function createProduct(req, res) {
    const product = await ProductService.createProduct(req.body, req.user.id);
    res.status(201).json({
        success: true,
        data: product,
        meta: { requestId: req.requestId }
    });
}

async function updateProduct(req, res) {
    const product = await ProductService.updateProduct(parseInt(req.params.id, 10), req.body, req.user.id);
    res.status(200).json({
        success: true,
        data: product,
        meta: { requestId: req.requestId }
    });
}

module.exports = {
    lookupProduct,
    listProducts,
    getProduct,
    createProduct,
    updateProduct
};
