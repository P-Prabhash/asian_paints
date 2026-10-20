const { pool } = require("../config/database");

class RevokedTokenRepository {
    static async isRevoked(jti) {
        if (!jti) return false;
        const [rows] = await pool.query(
            "SELECT `id` FROM `revoked_tokens` WHERE `jti` = ? AND `expires_at` > NOW() LIMIT 1",
            [jti]
        );
        return rows.length > 0;
    }

    static async revokeToken({ jti, userId, expiresAt }) {
        if (!jti) return;
        await pool.query(
            "INSERT IGNORE INTO `revoked_tokens` (`jti`, `user_id`, `expires_at`) VALUES (?, ?, ?)",
            [jti, userId, expiresAt]
        );
    }
}

module.exports = RevokedTokenRepository;
