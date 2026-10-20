const AuthService = require("../services/auth.service");

async function firstRunAdmin(req, res) {
    const admin = await AuthService.createFirstRunAdmin(req.body);
    res.status(201).json({
        success: true,
        data: {
            message: "Administrator account created successfully",
            admin
        },
        meta: { requestId: req.requestId }
    });
}

async function login(req, res) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const authData = await AuthService.login(req.body, ipAddress);
    res.status(200).json({
        success: true,
        data: authData,
        meta: { requestId: req.requestId }
    });
}

async function logout(req, res) {
    await AuthService.logout(req.user);
    res.status(200).json({
        success: true,
        data: { message: "Logged out successfully" },
        meta: { requestId: req.requestId }
    });
}

async function getMe(req, res) {
    const me = await AuthService.getMe(req.user.id);
    res.status(200).json({
        success: true,
        data: me,
        meta: { requestId: req.requestId }
    });
}

module.exports = {
    firstRunAdmin,
    login,
    logout,
    getMe
};
