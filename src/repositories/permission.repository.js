const { pool } = require("../config/database");

class PermissionRepository {
    static async listPermissions() {
        const [rows] = await pool.query("SELECT * FROM `permissions` ORDER BY `module`, `action` ASC");
        return rows;
    }
}

module.exports = PermissionRepository;
