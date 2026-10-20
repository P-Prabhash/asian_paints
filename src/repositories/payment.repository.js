const { pool } = require("../config/database");

class PaymentRepository {
    static async listPayments({ search, startDate, endDate, limit = 50, offset = 0 } = {}) {
        let where = ["1=1"];
        const params = [];

        if (search) {
            where.push("(s.`invoice_no` LIKE ? OR c.`name` LIKE ? OR p.`reference_no` LIKE ?)");
            const str = `%${search}%`;
            params.push(str, str, str);
        }

        if (startDate) {
            where.push("p.`received_at` >= ?");
            params.push(`${startDate} 00:00:00`);
        }

        if (endDate) {
            where.push("p.`received_at` <= ?");
            params.push(`${endDate} 23:59:59`);
        }

        const query = `
            SELECT p.*, s.\`invoice_no\`, c.\`name\` as customer_name, u.\`name\` as receiver_name
            FROM \`payments\` p
            LEFT JOIN \`sales\` s ON p.\`sale_id\` = s.\`id\`
            LEFT JOIN \`customers\` c ON p.\`customer_id\` = c.\`id\`
            JOIN \`users\` u ON p.\`received_by\` = u.\`id\`
            WHERE ${where.join(" AND ")}
            ORDER BY p.\`id\` DESC
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM \`payments\` p
            LEFT JOIN \`sales\` s ON p.\`sale_id\` = s.\`id\`
            LEFT JOIN \`customers\` c ON p.\`customer_id\` = c.\`id\`
            WHERE ${where.join(" AND ")}
        `;

        const [rows] = await pool.query(query, [...params, limit, offset]);
        const [countRows] = await pool.query(countQuery, params);

        return { payments: rows, total: countRows[0].total };
    }

    static async createPayment({ saleId, customerId, method, amount, referenceNo, notes, receivedBy }, conn = pool) {
        const [result] = await conn.query(
            `INSERT INTO \`payments\` (\`sale_id\`, \`customer_id\`, \`method\`, \`amount\`, \`reference_no\`, \`notes\`, \`received_by\`)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [saleId || null, customerId || null, method, amount, referenceNo || null, notes || null, receivedBy]
        );
        return result.insertId;
    }

    static async createCollectionReceipt({ receiptNo, customerId, paymentId, amount, paymentMethod, referenceNo, notes, createdBy }, conn = pool) {
        const [result] = await conn.query(
            `INSERT INTO \`collection_receipts\`
             (\`receipt_no\`, \`customer_id\`, \`payment_id\`, \`amount\`, \`payment_method\`, \`reference_no\`, \`notes\`, \`created_by\`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [receiptNo, customerId, paymentId, amount, paymentMethod, referenceNo || null, notes || null, createdBy]
        );
        return result.insertId;
    }
}

module.exports = PaymentRepository;
