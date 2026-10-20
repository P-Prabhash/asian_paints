const { pool } = require("../config/database");

class SettingsRepository {
    static async getAllSettings() {
        const [rows] = await pool.query("SELECT `setting_key`, `setting_value` FROM `settings`");
        const settingsMap = {};
        for (const row of rows) {
            settingsMap[row.setting_key] = row.setting_value;
        }
        return settingsMap;
    }

    static async getSetting(key) {
        const [rows] = await pool.query("SELECT `setting_value` FROM `settings` WHERE `setting_key` = ? LIMIT 1", [key]);
        return rows[0] ? rows[0].setting_value : null;
    }

    static async updateSettings(settingsObj, userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const [key, value] of Object.entries(settingsObj)) {
                await connection.query(
                    `INSERT INTO \`settings\` (\`setting_key\`, \`setting_value\`, \`updated_by\`)
                     VALUES (?, ?, ?)
                     ON DUPLICATE KEY UPDATE \`setting_value\` = VALUES(\`setting_value\`), \`updated_by\` = VALUES(\`updated_by\`)`,
                    [key, String(value), userId || null]
                );
            }

            await connection.commit();
            return true;
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }
}

module.exports = SettingsRepository;
