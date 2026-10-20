const SettingsRepository = require("../repositories/settings.repository");
const AuditRepository = require("../repositories/audit.repository");

class SettingsService {
    static async getSettings() {
        return SettingsRepository.getAllSettings();
    }

    static async updateSettings(settingsObj, actorId) {
        await SettingsRepository.updateSettings(settingsObj, actorId);

        await AuditRepository.createLog({
            userId: actorId,
            action: "SETTINGS_UPDATED",
            entityType: "SETTINGS",
            entityId: null,
            metadata: { updatedKeys: Object.keys(settingsObj) }
        });

        return SettingsRepository.getAllSettings();
    }
}

module.exports = SettingsService;
