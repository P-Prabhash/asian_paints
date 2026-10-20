const SettingsService = require("../services/settings.service");

async function getSettings(req, res) {
    const settingsMap = await SettingsService.getSettings();
    res.status(200).json({
        success: true,
        data: settingsMap,
        meta: { requestId: req.requestId }
    });
}

async function updateSettings(req, res) {
    const updatedMap = await SettingsService.updateSettings(req.body, req.user.id);
    res.status(200).json({
        success: true,
        data: updatedMap,
        meta: { requestId: req.requestId }
    });
}

module.exports = {
    getSettings,
    updateSettings
};
