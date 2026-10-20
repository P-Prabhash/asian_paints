const UserService = require("../services/user.service");

async function listUsers(req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const result = await UserService.listUsers({ limit, offset });
    res.status(200).json({
        success: true,
        data: result.users,
        meta: {
            requestId: req.requestId,
            pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
        }
    });
}

async function getUser(req, res) {
    const user = await UserService.getUserById(parseInt(req.params.id, 10));
    res.status(200).json({
        success: true,
        data: user,
        meta: { requestId: req.requestId }
    });
}

async function createUser(req, res) {
    const user = await UserService.createUser(req.body, req.user.id);
    res.status(201).json({
        success: true,
        data: user,
        meta: { requestId: req.requestId }
    });
}

async function updateUser(req, res) {
    const user = await UserService.updateUser(parseInt(req.params.id, 10), req.body, req.user.id);
    res.status(200).json({
        success: true,
        data: user,
        meta: { requestId: req.requestId }
    });
}

async function deleteUser(req, res) {
    await UserService.deleteUser(parseInt(req.params.id, 10), req.user.id);
    res.status(200).json({
        success: true,
        data: { message: "User deleted successfully" },
        meta: { requestId: req.requestId }
    });
}

module.exports = {
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser
};
