const { pool } = require("../config/database");

class AuditRepository {
    static async createLog({ userId, action, entityType, entityId, metadata = null, ipAddress = null }, conn = pool) {
        await conn.query(
            `INSERT INTO \`audit_logs\` (\`user_id\`, \`action\`, \`entity_type\`, \`entity_id\`, \`metadata_json\`, \`ip_address\`)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId || null, action, entityType, entityId ? String(entityId) : null, metadata ? JSON.stringify(metadata) : null, ipAddress || null]
        );
    }

    static async listLogs({ userId, action, limit = 50, offset = 0 } = {}) {
        let where = ["1=1"];
        const params = [];

        if (userId) {
            where.push("a.`user_id` = ?");
            params.push(userId);
        }

        if (action) {
            where.push("a.`action` LIKE ?");
            params.push(`%${action}%`);
        }

        const query = `
            SELECT a.*, u.\`name\` as user_name, u.\`username\`
            FROM \`audit_logs\` a
            LEFT JOIN \`users\` u ON a.\`user_id\` = u.\`id\`
            WHERE ${where.join(" AND ")}
            ORDER BY a.\`id\` DESC
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT COUNT(*) as total FROM \`audit_logs\` a WHERE ${where.join(" AND ")}
        `;

        const [rows] = await pool.query(query, [...params, limit, offset]);
        const [countRows] = await pool.query(countQuery, params);

        return { logs: rows, total: countRows[0].total };
    }
}

module.exports = AuditRepository;
