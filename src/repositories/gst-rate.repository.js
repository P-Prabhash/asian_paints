const { pool } = require("../config/database");

class GstRateRepository {
    static async listGstRates() {
        const [rows] = await pool.query("SELECT * FROM `gst_rates` ORDER BY `rate` ASC");
        return rows;
    }

    static async createGstRate({ rate, name, description }) {
        const [result] = await pool.query(
            "INSERT INTO `gst_rates` (`rate`, `name`, `description`) VALUES (?, ?, ?)",
            [rate, name, description || null]
        );
        return result.insertId;
    }
}

module.exports = GstRateRepository;
