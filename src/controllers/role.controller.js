const UserService = require("../services/user.service");

async function listRoles(req, res) {
    const roles = await UserService.listRoles();
    res.status(200).json({
        success: true,
        data: roles,
        meta: { requestId: req.requestId }
    });
}

async function createRole(req, res) {
    const role = await UserService.createRole(req.body, req.user.id);
    res.status(201).json({
        success: true,
        data: role,
        meta: { requestId: req.requestId }
    });
}

async function getRolePermissions(req, res) {
    const result = await UserService.getRolePermissions(parseInt(req.params.id, 10));
    res.status(200).json({
        success: true,
        data: result,
        meta: { requestId: req.requestId }
    });
}

async function updateRolePermissions(req, res) {
    const result = await UserService.updateRolePermissions(parseInt(req.params.id, 10), req.body.permissionIds, req.user.id);
    res.status(200).json({
        success: true,
        data: result,
        meta: { requestId: req.requestId }
    });
}

module.exports = {
    listRoles,
    createRole,
    getRolePermissions,
    updateRolePermissions
};
