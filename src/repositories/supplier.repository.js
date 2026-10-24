const { pool } = require("../config/database");

class SupplierRepository {
    static async listSuppliers({ search, limit = 50, offset = 0 } = {}) {
        let where = ["1=1"];
        const params = [];

        if (search) {
            where.push("(`name` LIKE ? OR `mobile` LIKE ? OR `gstin` LIKE ?)");
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        const query = `SELECT * FROM \`suppliers\` WHERE ${where.join(" AND ")} ORDER BY \`id\` DESC LIMIT ? OFFSET ?`;
        const countQuery = `SELECT COUNT(*) as total FROM \`suppliers\` WHERE ${where.join(" AND ")}`;

        const [rows] = await pool.query(query, [...params, limit, offset]);
        const [countRows] = await pool.query(countQuery, params);

        return { suppliers: rows, total: countRows[0].total };
    }

    static async findById(id, conn = pool) {
        const [rows] = await conn.query("SELECT * FROM `suppliers` WHERE `id` = ? LIMIT 1", [id]);
        return rows[0] || null;
    }

    static async createSupplier({ name, mobile, address, gstin, active = true }) {
        const [result] = await pool.query(
            `INSERT INTO \`suppliers\` (\`name\`, \`mobile\`, \`address\`, \`gstin\`, \`active\`)
             VALUES (?, ?, ?, ?, ?)`,
            [name, mobile || null, address || null, gstin || null, active ? 1 : 0]
        );
        return result.insertId;
    }

    static async updateSupplier(id, updates) {
        const fields = [];
        const values = [];

        if (updates.name !== undefined) { fields.push("`name` = ?"); values.push(updates.name); }
        if (updates.mobile !== undefined) { fields.push("`mobile` = ?"); values.push(updates.mobile || null); }
        if (updates.address !== undefined) { fields.push("`address` = ?"); values.push(updates.address || null); }
        if (updates.gstin !== undefined) { fields.push("`gstin` = ?"); values.push(updates.gstin || null); }
        if (updates.active !== undefined) { fields.push("`active` = ?"); values.push(updates.active ? 1 : 0); }

        if (fields.length === 0) return false;

        values.push(id);
        const [result] = await pool.query(
            `UPDATE \`suppliers\` SET ${fields.join(", ")} WHERE \`id\` = ?`,
            values
        );
        return result.affectedRows > 0;
    }
}

module.exports = SupplierRepository;
