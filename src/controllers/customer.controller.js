const CustomerService = require("../services/customer.service");

async function listCustomers(req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const result = await CustomerService.listCustomers({ search: req.query.search, limit, offset });
    res.status(200).json({
        success: true,
        data: result.customers,
        meta: {
            requestId: req.requestId,
            pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
        }
    });
}

async function getCustomer(req, res) {
    const customer = await CustomerService.getCustomerById(parseInt(req.params.id, 10));
    res.status(200).json({
        success: true,
        data: customer,
        meta: { requestId: req.requestId }
    });
}

async function createCustomer(req, res) {
    const customer = await CustomerService.createCustomer(req.body, req.user.id);
    res.status(201).json({
        success: true,
        data: customer,
        meta: { requestId: req.requestId }
    });
}

async function updateCustomer(req, res) {
    const customer = await CustomerService.updateCustomer(parseInt(req.params.id, 10), req.body, req.user.id);
    res.status(200).json({
        success: true,
        data: customer,
        meta: { requestId: req.requestId }
    });
}

async function deleteCustomer(req, res) {
    const result = await CustomerService.deleteCustomer(parseInt(req.params.id, 10), req.user.id);
    res.status(200).json({
        success: true,
        message: "Customer deleted successfully.",
        data: result,
        meta: { requestId: req.requestId }
    });
}

async function getCustomerLedger(req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const result = await CustomerService.getCustomerLedger(parseInt(req.params.id, 10), { limit, offset });
    res.status(200).json({
        success: true,
        data: result,
        meta: {
            requestId: req.requestId,
            pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
        }
    });
}

async function collectPayment(req, res) {
    const result = await CustomerService.collectPayment(parseInt(req.params.id, 10), req.body, req.user.id);
    res.status(201).json({
        success: true,
        data: result,
        meta: { requestId: req.requestId }
    });
}

module.exports = {
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerLedger,
    collectPayment
};
