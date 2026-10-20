const { pool } = require("../config/database");

class BackupRepository {
    static async createMetadata({ fileName, fileSize, schemaVersion, checksum, createdBy }) {
        const [result] = await pool.query(
            `INSERT INTO \`backup_metadata\` (\`file_name\`, \`file_size\`, \`schema_version\`, \`checksum\`, \`created_by\`)
             VALUES (?, ?, ?, ?, ?)`,
            [fileName, fileSize, schemaVersion, checksum, createdBy]
        );
        return result.insertId;
    }

    static async listMetadata() {
        const [rows] = await pool.query(
            `SELECT b.*, u.\`name\` as creator_name
             FROM \`backup_metadata\` b
             JOIN \`users\` u ON b.\`created_by\` = u.\`id\`
             ORDER BY b.\`id\` DESC`
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM `backup_metadata` WHERE `id` = ? LIMIT 1", [id]);
        return rows[0] || null;
    }
}

module.exports = BackupRepository;
