const { pool } = require("../config/database");

class UnitRepository {
    static async listUnits() {
        const [rows] = await pool.query(
            `SELECT u.*, bu.\`code\` as base_unit_code
             FROM \`units\` u
             LEFT JOIN \`units\` bu ON u.\`base_unit_id\` = bu.\`id\`
             ORDER BY u.\`id\` ASC`
        );
        return rows;
    }

    static async createUnit({ code, name, baseUnitId, conversionFactor = 1 }) {
        const [result] = await pool.query(
            "INSERT INTO `units` (`code`, `name`, `base_unit_id`, `conversion_factor`) VALUES (?, ?, ?, ?)",
            [code.toUpperCase(), name, baseUnitId || null, conversionFactor]
        );
        return result.insertId;
    }
}

module.exports = UnitRepository;
