const { pool } = require("../config/database");

class RoleRepository {
    static async listRoles() {
        const [rows] = await pool.query("SELECT * FROM `roles` ORDER BY `id` ASC");
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM `roles` WHERE `id` = ? LIMIT 1", [id]);
        return rows[0] || null;
    }

    static async createRole({ roleName, description }) {
        const [result] = await pool.query(
            "INSERT INTO `roles` (`role_name`, `description`) VALUES (?, ?)",
            [roleName, description || null]
        );
        return result.insertId;
    }

    static async updateRole(id, { roleName, description }) {
        const [result] = await pool.query(
            "UPDATE `roles` SET `role_name` = COALESCE(?, `role_name`), `description` = COALESCE(?, `description`) WHERE `id` = ?",
            [roleName, description, id]
        );
        return result.affectedRows > 0;
    }

    static async getRolePermissions(roleId) {
        const [rows] = await pool.query(
            `SELECT p.*
             FROM \`role_permissions\` rp
             JOIN \`permissions\` p ON rp.\`permission_id\` = p.\`id\`
             WHERE rp.\`role_id\` = ?`,
            [roleId]
        );
        return rows;
    }

    static async updateRolePermissions(roleId, permissionIds) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            await connection.query("DELETE FROM `role_permissions` WHERE `role_id` = ?", [roleId]);

            if (permissionIds && permissionIds.length > 0) {
                const values = permissionIds.map(pid => [roleId, pid]);
                await connection.query(
                    "INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES ?",
                    [values]
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

module.exports = RoleRepository;
