const { pool } = require("../config/database");

class PurchaseRepository {
    static async listPurchases({ search, limit = 50, offset = 0 } = {}) {
        let where = ["1=1"];
        const params = [];

        if (search) {
            where.push("(p.`purchase_no` LIKE ? OR p.`supplier_invoice_no` LIKE ? OR s.`name` LIKE ?)");
            const str = `%${search}%`;
            params.push(str, str, str);
        }

        const query = `
            SELECT p.*, s.\`name\` as supplier_name, u.\`name\` as creator_name
            FROM \`purchases\` p
            JOIN \`suppliers\` s ON p.\`supplier_id\` = s.\`id\`
            JOIN \`users\` u ON p.\`created_by\` = u.\`id\`
            WHERE ${where.join(" AND ")}
            ORDER BY p.\`id\` DESC
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM \`purchases\` p
            JOIN \`suppliers\` s ON p.\`supplier_id\` = s.\`id\`
            WHERE ${where.join(" AND ")}
        `;

        const [rows] = await pool.query(query, [...params, limit, offset]);
        const [countRows] = await pool.query(countQuery, params);

        return { purchases: rows, total: countRows[0].total };
    }

    static async findById(id, conn = pool) {
        const query = `
            SELECT p.*, s.\`name\` as supplier_name, u.\`name\` as creator_name
            FROM \`purchases\` p
            JOIN \`suppliers\` s ON p.\`supplier_id\` = s.\`id\`
            JOIN \`users\` u ON p.\`created_by\` = u.\`id\`
            WHERE p.\`id\` = ?
            LIMIT 1
        `;
        const [rows] = await conn.query(query, [id]);
        if (rows.length === 0) return null;

        const purchase = rows[0];

        const itemsQuery = `
            SELECT pi.*, pr.\`name\` as product_name, pr.\`sku\`, pr.\`barcode\`
            FROM \`purchase_items\` pi
            JOIN \`products\` pr ON pi.\`product_id\` = pr.\`id\`
            WHERE pi.\`purchase_id\` = ?
        `;
        const [items] = await conn.query(itemsQuery, [id]);
        purchase.items = items;

        return purchase;
    }

    static async createPurchase({ purchaseNo, supplierId, supplierInvoiceNo, invoiceDate, subtotal, taxTotal, grandTotal, notes, createdBy }, conn) {
        const [result] = await conn.query(
            `INSERT INTO \`purchases\`
             (\`purchase_no\`, \`supplier_id\`, \`supplier_invoice_no\`, \`invoice_date\`, \`subtotal\`, \`tax_total\`, \`grand_total\`, \`notes\`, \`created_by\`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [purchaseNo, supplierId, supplierInvoiceNo || null, invoiceDate, subtotal, taxTotal, grandTotal, notes || null, createdBy]
        );
        return result.insertId;
    }

    static async createPurchaseItem({ purchaseId, productId, qty, unitCost, discount, taxableValue, taxAmount, lineTotal }, conn) {
        await conn.query(
            `INSERT INTO \`purchase_items\`
             (\`purchase_id\`, \`product_id\`, \`qty\`, \`unit_cost\`, \`discount\`, \`taxable_value\`, \`tax_amount\`, \`line_total\`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [purchaseId, productId, qty, unitCost, discount, taxableValue, taxAmount, lineTotal]
        );
    }
}

module.exports = PurchaseRepository;
