const { pool } = require("../config/database");

class ProductRepository {
    static async lookupByCode(code) {
        const query = `
            SELECT p.*, c.\`name\` as category_name, u.\`code\` as unit_code, u.\`name\` as unit_name, g.\`rate\` as gst_rate
            FROM \`products\` p
            JOIN \`categories\` c ON p.\`category_id\` = c.\`id\`
            JOIN \`units\` u ON p.\`unit_id\` = u.\`id\`
            JOIN \`gst_rates\` g ON p.\`gst_rate_id\` = g.\`id\`
            WHERE (p.\`barcode\` = ? OR p.\`sku\` = ? OR p.\`name\` LIKE ?) AND p.\`active\` = 1
            LIMIT 10
        `;
        const likeCode = `%${code}%`;
        const [rows] = await pool.query(query, [code, code, likeCode]);
        return rows;
    }

    static async findById(id, conn = pool) {
        const query = `
            SELECT p.*, c.\`name\` as category_name, u.\`code\` as unit_code, u.\`name\` as unit_name, g.\`rate\` as gst_rate
            FROM \`products\` p
            JOIN \`categories\` c ON p.\`category_id\` = c.\`id\`
            JOIN \`units\` u ON p.\`unit_id\` = u.\`id\`
            JOIN \`gst_rates\` g ON p.\`gst_rate_id\` = g.\`id\`
            WHERE p.\`id\` = ?
            LIMIT 1
        `;
        const [rows] = await conn.query(query, [id]);
        return rows[0] || null;
    }

    static async findByIdsForUpdate(ids, conn) {
        if (!ids || ids.length === 0) return [];
        const placeholders = ids.map(() => '?').join(',');
        const query = `
            SELECT p.*, c.\`name\` as category_name, u.\`code\` as unit_code, u.\`name\` as unit_name, g.\`rate\` as gst_rate
            FROM \`products\` p
            JOIN \`categories\` c ON p.\`category_id\` = c.\`id\`
            JOIN \`units\` u ON p.\`unit_id\` = u.\`id\`
            JOIN \`gst_rates\` g ON p.\`gst_rate_id\` = g.\`id\`
            WHERE p.\`id\` IN (${placeholders})
            FOR UPDATE
        `;
        const [rows] = await conn.query(query, ids);
        return rows;
    }

    static async findBySku(sku) {
        const [rows] = await pool.query("SELECT * FROM `products` WHERE `sku` = ? LIMIT 1", [sku]);
        return rows[0] || null;
    }

    static async findByBarcode(barcode) {
        if (!barcode) return null;
        const [rows] = await pool.query("SELECT * FROM `products` WHERE `barcode` = ? LIMIT 1", [barcode]);
        return rows[0] || null;
    }

    static async createProduct(productData) {
        const {
            sku, barcode, name, categoryId, brand, size, shade, hsnCode,
            unitId, gstRateId, purchasePrice, salePrice, reorderLevel,
            stockAlertDescription, stockQty, active
        } = productData;

        const [result] = await pool.query(
            `INSERT INTO \`products\`
            (\`sku\`, \`barcode\`, \`name\`, \`category_id\`, \`brand\`, \`size\`, \`shade\`, \`hsn_code\`, \`unit_id\`, \`gst_rate_id\`, \`purchase_price\`, \`sale_price\`, \`reorder_level\`, \`stock_alert_description\`, \`stock_qty\`, \`active\`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                sku, barcode || null, name, categoryId, brand || null, size || null, shade || null,
                hsnCode || null, unitId, gstRateId, purchasePrice, salePrice,
                reorderLevel ?? 10, stockAlertDescription ?? null, stockQty ?? 0, active ? 1 : 0
            ]
        );
        return result.insertId;
    }

    static async updateProduct(id, updates) {
        const fields = [];
        const values = [];

        const mapping = {
            sku: "`sku` = ?",
            barcode: "`barcode` = ?",
            name: "`name` = ?",
            categoryId: "`category_id` = ?",
            brand: "`brand` = ?",
            size: "`size` = ?",
            shade: "`shade` = ?",
            hsnCode: "`hsn_code` = ?",
            unitId: "`unit_id` = ?",
            gstRateId: "`gst_rate_id` = ?",
            purchasePrice: "`purchase_price` = ?",
            salePrice: "`sale_price` = ?",
            reorderLevel: "`reorder_level` = ?",
            stockAlertDescription: "`stock_alert_description` = ?",
            stockQty: "`stock_qty` = ?",
            active: "`active` = ?"
        };

        for (const [key, col] of Object.entries(mapping)) {
            if (updates[key] !== undefined) {
                fields.push(col);
                values.push(key === "active" ? (updates[key] ? 1 : 0) : updates[key]);
            }
        }

        if (fields.length === 0) return false;

        values.push(id);
        const [result] = await pool.query(
            `UPDATE \`products\` SET ${fields.join(", ")} WHERE \`id\` = ?`,
            values
        );
        return result.affectedRows > 0;
    }

    static async updateStockQty(id, newQty, conn = pool) {
        await conn.query("UPDATE `products` SET `stock_qty` = ? WHERE `id` = ?", [newQty, id]);
    }

    static async listProducts({ search, categoryId, activeOnly = false, limit = 50, offset = 0 } = {}) {
        let where = ["1=1"];
        const params = [];

        if (search) {
            where.push("(p.`name` LIKE ? OR p.`sku` LIKE ? OR p.`barcode` LIKE ? OR p.`brand` LIKE ?)");
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }

        if (categoryId) {
            where.push("p.`category_id` = ?");
            params.push(categoryId);
        }

        if (activeOnly) {
            where.push("p.`active` = 1");
        }

        const query = `
            SELECT p.*, c.\`name\` as category_name, u.\`code\` as unit_code, u.\`name\` as unit_name, g.\`rate\` as gst_rate
            FROM \`products\` p
            JOIN \`categories\` c ON p.\`category_id\` = c.\`id\`
            JOIN \`units\` u ON p.\`unit_id\` = u.\`id\`
            JOIN \`gst_rates\` g ON p.\`gst_rate_id\` = g.\`id\`
            WHERE ${where.join(" AND ")}
            ORDER BY p.\`id\` DESC
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM \`products\` p
            WHERE ${where.join(" AND ")}
        `;

        const [rows] = await pool.query(query, [...params, limit, offset]);
        const [countRows] = await pool.query(countQuery, params);

        return { products: rows, total: countRows[0].total };
    }
}

module.exports = ProductRepository;
