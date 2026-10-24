const { pool } = require("../config/database");

class CategoryRepository {
    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM `categories` WHERE `id` = ? LIMIT 1", [id]);
        return rows[0] || null;
    }
}

module.exports = CategoryRepository;
