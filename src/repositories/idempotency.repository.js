const { pool } = require("../config/database");

class IdempotencyRepository {
    static async findKey(key, path, conn = pool) {
        const [rows] = await conn.query(
            "SELECT * FROM `idempotency_keys` WHERE `idempotency_key` = ? AND `request_path` = ? LIMIT 1",
            [key, path]
        );
        return rows[0] || null;
    }

    static async saveKey({ key, path, responseCode, responseBody }, conn = pool) {
        await conn.query(
            `INSERT INTO \`idempotency_keys\` (\`idempotency_key\`, \`request_path\`, \`response_code\`, \`response_body\`)
             VALUES (?, ?, ?, ?)`,
            [key, path, responseCode, JSON.stringify(responseBody)]
        );
    }
}

module.exports = IdempotencyRepository;
