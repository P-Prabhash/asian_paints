const { pool } = require("../config/database");

class StockRepository {
    static async listStock({ search, categoryId, lowStockOnly = false, limit = 50, offset = 0 } = {}) {
        let where = ["p.`active` = 1"];
        const params = [];

        if (search) {
            where.push("(p.`name` LIKE ? OR p.`sku` LIKE ? OR p.`barcode` LIKE ?)");
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        if (categoryId) {
            where.push("p.`category_id` = ?");
            params.push(categoryId);
        }

        if (lowStockOnly) {
            where.push("p.`stock_qty` <= p.`reorder_level`");
        }

        const query = `
            SELECT p.\`id\`, p.\`sku\`, p.\`barcode\`, p.\`name\`, p.\`brand\`, p.\`size\`, p.\`shade\`,
                   p.\`stock_qty\`, p.\`reorder_level\`, p.\`purchase_price\`, p.\`sale_price\`,
                   c.\`name\` as category_name, u.\`code\` as unit_code
            FROM \`products\` p
            JOIN \`categories\` c ON p.\`category_id\` = c.\`id\`
            JOIN \`units\` u ON p.\`unit_id\` = u.\`id\`
            WHERE ${where.join(" AND ")}
            ORDER BY p.\`stock_qty\` ASC
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT COUNT(*) as total FROM \`products\` p WHERE ${where.join(" AND ")}
        `;

        const [rows] = await pool.query(query, [...params, limit, offset]);
        const [countRows] = await pool.query(countQuery, params);

        return { stock: rows, total: countRows[0].total };
    }

    static async listMovements({ productId, movementType, limit = 50, offset = 0 } = {}) {
        let where = ["1=1"];
        const params = [];

        if (productId) {
            where.push("sm.`product_id` = ?");
            params.push(productId);
        }

        if (movementType) {
            where.push("sm.`movement_type` = ?");
            params.push(movementType);
        }

        const query = `
            SELECT sm.*, p.\`name\` as product_name, p.\`sku\`, u.\`name\` as user_name
            FROM \`stock_movements\` sm
            JOIN \`products\` p ON sm.\`product_id\` = p.\`id\`
            JOIN \`users\` u ON sm.\`created_by\` = u.\`id\`
            WHERE ${where.join(" AND ")}
            ORDER BY sm.\`id\` DESC
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT COUNT(*) as total FROM \`stock_movements\` sm WHERE ${where.join(" AND ")}
        `;

        const [rows] = await pool.query(query, [...params, limit, offset]);
        const [countRows] = await pool.query(countQuery, params);

        return { movements: rows, total: countRows[0].total };
    }

    static async addMovement({ productId, movementType, qtyIn = 0, qtyOut = 0, referenceType, referenceId, reason, createdBy }, conn = pool) {
        await conn.query(
            `INSERT INTO \`stock_movements\`
             (\`product_id\`, \`movement_type\`, \`qty_in\`, \`qty_out\`, \`reference_type\`, \`reference_id\`, \`reason\`, \`created_by\`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [productId, movementType, qtyIn, qtyOut, referenceType || null, referenceId || null, reason || null, createdBy]
        );
    }
}

module.exports = StockRepository;
