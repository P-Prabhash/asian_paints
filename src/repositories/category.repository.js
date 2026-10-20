const { pool } = require("../config/database");

class CategoryRepository {
    static async listCategories() {
        const [rows] = await pool.query("SELECT * FROM `categories` ORDER BY `id` ASC");
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM `categories` WHERE `id` = ? LIMIT 1", [id]);
        return rows[0] || null;
    }

    static async createCategory({ name, description, active = true }) {
        const [result] = await pool.query(
            "INSERT INTO `categories` (`name`, `description`, `active`) VALUES (?, ?, ?)",
            [name, description || null, active ? 1 : 0]
        );
        return result.insertId;
    }
}

module.exports = CategoryRepository;
