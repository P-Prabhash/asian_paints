const { pool } = require("../config/database");

class UserRepository {
    static async countUsers() {
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM `users`");
        return rows[0].count;
    }

    static async countAdmins() {
        const [rows] = await pool.query(
            "SELECT COUNT(*) as count FROM `users` u JOIN `roles` r ON u.`role_id` = r.`id` WHERE r.`role_name` = 'ADMIN'"
        );
        return rows[0].count;
    }

    static async findByUsernameOrEmail(identifier) {
        const [rows] = await pool.query(
            `SELECT u.*, r.\`role_name\`
             FROM \`users\` u
             JOIN \`roles\` r ON u.\`role_id\` = r.\`id\`
             WHERE u.\`username\` = ? OR u.\`email\` = ?
             LIMIT 1`,
            [identifier, identifier]
        );
        return rows[0] || null;
    }

    static async findById(id) {
        const [rows] = await pool.query(
            `SELECT u.\`id\`, u.\`name\`, u.\`username\`, u.\`email\`, u.\`role_id\`, u.\`is_active\`, u.\`last_login_at\`, u.\`created_at\`, u.\`updated_at\`, r.\`role_name\`
             FROM \`users\` u
             JOIN \`roles\` r ON u.\`role_id\` = r.\`id\`
             WHERE u.\`id\` = ?
             LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    }

    static async getUserPermissions(userId, roleId) {
        const [rolePerms] = await pool.query(
            `SELECT p.\`permission_key\`
             FROM \`role_permissions\` rp
             JOIN \`permissions\` p ON rp.\`permission_id\` = p.\`id\`
             WHERE rp.\`role_id\` = ?`,
            [roleId]
        );

        const permSet = new Set(rolePerms.map(rp => rp.permission_key));

        const [userPerms] = await pool.query(
            `SELECT p.\`permission_key\`, up.\`allowed\`
             FROM \`user_permissions\` up
             JOIN \`permissions\` p ON up.\`permission_id\` = p.\`id\`
             WHERE up.\`user_id\` = ?`,
            [userId]
        );

        for (const up of userPerms) {
            if (up.allowed === 1) {
                permSet.add(up.permission_key);
            } else {
                permSet.delete(up.permission_key);
            }
        }

        return Array.from(permSet);
    }

    static async createUser({ name, username, email, passwordHash, roleId, isActive = 1 }) {
        const [result] = await pool.query(
            `INSERT INTO \`users\` (\`name\`, \`username\`, \`email\`, \`password_hash\`, \`role_id\`, \`is_active\`)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, username, email || null, passwordHash, roleId, isActive ? 1 : 0]
        );
        return result.insertId;
    }

    static async updateUser(id, updates) {
        const fields = [];
        const values = [];

        if (updates.name !== undefined) { fields.push("`name` = ?"); values.push(updates.name); }
        if (updates.username !== undefined) { fields.push("`username` = ?"); values.push(updates.username); }
        if (updates.email !== undefined) { fields.push("`email` = ?"); values.push(updates.email || null); }
        if (updates.passwordHash !== undefined) { fields.push("`password_hash` = ?"); values.push(updates.passwordHash); }
        if (updates.roleId !== undefined) { fields.push("`role_id` = ?"); values.push(updates.roleId); }
        if (updates.isActive !== undefined) { fields.push("`is_active` = ?"); values.push(updates.isActive ? 1 : 0); }

        if (fields.length === 0) return false;

        values.push(id);
        const [result] = await pool.query(
            `UPDATE \`users\` SET ${fields.join(", ")} WHERE \`id\` = ?`,
            values
        );
        return result.affectedRows > 0;
    }

    static async deleteUser(id) {
        const [result] = await pool.query("DELETE FROM `users` WHERE `id` = ?", [id]);
        return result.affectedRows > 0;
    }

    static async updateLastLogin(id) {
        await pool.query("UPDATE `users` SET `last_login_at` = NOW() WHERE `id` = ?", [id]);
    }

    static async listUsers({ limit = 50, offset = 0 } = {}) {
        const [rows] = await pool.query(
            `SELECT u.\`id\`, u.\`name\`, u.\`username\`, u.\`email\`, u.\`role_id\`, u.\`is_active\`, u.\`last_login_at\`, u.\`created_at\`, r.\`role_name\`
             FROM \`users\` u
             JOIN \`roles\` r ON u.\`role_id\` = r.\`id\`
             ORDER BY u.\`id\` ASC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        const [countRows] = await pool.query("SELECT COUNT(*) as total FROM `users`");
        return { users: rows, total: countRows[0].total };
    }
}

module.exports = UserRepository;
