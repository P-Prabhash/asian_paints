const { pool } = require("../config/database");
const { roundToTwoDecimals } = require("../utils/money");
const { normalizeCategoryFilter } = require("../utils/sales-category");

class SaleRepository {
    static async listSales({ search, startDate, endDate, customerId, paymentStatus, categoryFilter, limit = 50, offset = 0 } = {}) {
        let where = ["1=1"];
        const params = [];

        if (search) {
            where.push("(s.`invoice_no` LIKE ? OR c.`name` LIKE ? OR c.`mobile` LIKE ?)");
            const str = `%${search}%`;
            params.push(str, str, str);
        }

        if (startDate) {
            where.push("s.`created_at` >= ?");
            params.push(`${startDate} 00:00:00`);
        }

        if (endDate) {
            where.push("s.`created_at` <= ?");
            params.push(`${endDate} 23:59:59`);
        }

        if (customerId) {
            where.push("s.`customer_id` = ?");
            params.push(customerId);
        }

        if (paymentStatus) {
            where.push("s.`payment_status` = ?");
            params.push(paymentStatus);
        }

        if (categoryFilter && normalizeCategoryFilter(categoryFilter) !== "ALL") {
            where.push("s.`category_filter` = ?");
            params.push(normalizeCategoryFilter(categoryFilter));
        }

        const query = `
            SELECT s.*, c.\`name\` as customer_name, c.\`mobile\` as customer_mobile, u.\`name\` as creator_name
            FROM \`sales\` s
            LEFT JOIN \`customers\` c ON s.\`customer_id\` = c.\`id\`
            JOIN \`users\` u ON s.\`created_by\` = u.\`id\`
            WHERE ${where.join(" AND ")}
            ORDER BY s.\`id\` DESC
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM \`sales\` s
            LEFT JOIN \`customers\` c ON s.\`customer_id\` = c.\`id\`
            WHERE ${where.join(" AND ")}
        `;

        const [rows] = await pool.query(query, [...params, limit, offset]);
        const [countRows] = await pool.query(countQuery, params);

        return { sales: rows, total: countRows[0].total };
    }

    static async findById(id, conn = pool, lock = false) {
        const query = `
            SELECT s.*, c.\`name\` as customer_name, c.\`mobile\` as customer_mobile, c.\`address\` as customer_address, c.\`gstin\` as customer_gstin, u.\`name\` as creator_name
            FROM \`sales\` s
            LEFT JOIN \`customers\` c ON s.\`customer_id\` = c.\`id\`
            JOIN \`users\` u ON s.\`created_by\` = u.\`id\`
            WHERE s.\`id\` = ?
            LIMIT 1${lock ? " FOR UPDATE" : ""}
        `;
        const [rows] = await conn.query(query, [id]);
        if (rows.length === 0) return null;

        return this.attachSaleDetails(rows[0], conn);
    }

    static async findByInvoiceNo(invoiceNo, conn = pool, lock = false) {
        const query = `
            SELECT s.*, c.\`name\` as customer_name, c.\`mobile\` as customer_mobile, c.\`address\` as customer_address, c.\`gstin\` as customer_gstin, u.\`name\` as creator_name
            FROM \`sales\` s
            LEFT JOIN \`customers\` c ON s.\`customer_id\` = c.\`id\`
            JOIN \`users\` u ON s.\`created_by\` = u.\`id\`
            WHERE s.\`invoice_no\` = ?
            LIMIT 1${lock ? " FOR UPDATE" : ""}
        `;
        const [rows] = await conn.query(query, [invoiceNo]);
        if (rows.length === 0) return null;

        return this.attachSaleDetails(rows[0], conn);
    }

    static async findByIdentifier(identifier, conn = pool, lock = false) {
        const saleByInvoice = await this.findByInvoiceNo(String(identifier), conn, lock);
        if (saleByInvoice) return saleByInvoice;

        const value = String(identifier);
        if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) return null;
        return this.findById(Number(value), conn, lock);
    }

    static async attachSaleDetails(sale, conn) {
        const id = sale.id;
        const itemsQuery = "SELECT * FROM `sale_items` WHERE `sale_id` = ?";
        const [items] = await conn.query(itemsQuery, [id]);
        sale.items = items.map(item => ({
            ...item,
            unit_price_inclusive: roundToTwoDecimals(
                Number(item.unit_price) * (1 + Number(item.tax_rate_snapshot) / 100)
            )
        }));

        const paymentsQuery = "SELECT * FROM `payments` WHERE `sale_id` = ?";
        const [payments] = await conn.query(paymentsQuery, [id]);
        sale.payments = payments;

        const returnsQuery = "SELECT * FROM `sale_returns` WHERE `sale_id` = ?";
        const [returns] = await conn.query(returnsQuery, [id]);
        sale.returns = returns;

        return sale;
    }

    static async getReturnedQuantitiesBySaleId(saleId, conn = pool) {
        const [rows] = await conn.query(
            `SELECT sri.\`product_id\`,
                    SUM(sri.\`qty\`) AS returned_qty,
                    SUM(sri.\`refund_amount\`) AS refunded_amount
             FROM \`sale_return_items\` sri
             JOIN \`sale_returns\` sr ON sr.\`id\` = sri.\`return_id\`
             WHERE sr.\`sale_id\` = ?
             GROUP BY sri.\`product_id\``,
            [saleId]
        );
        return rows;
    }

    static async updateStatus(id, status, conn) {
        const [result] = await conn.query(
            "UPDATE `sales` SET `status` = ? WHERE `id` = ? AND `status` = 'COMPLETED'",
            [status, id]
        );
        return result.affectedRows > 0;
    }

    static async createSale(saleData, conn) {
        const {
            invoiceNo, customerId, categoryFilter, subtotal, discountTotal, taxableTotal,
            cgstTotal, sgstTotal, igstTotal, roundOff, grandTotal, paidTotal, dueTotal,
            paymentStatus, status, createdBy
        } = saleData;

        const [result] = await conn.query(
            `INSERT INTO \`sales\`
            (\`invoice_no\`, \`customer_id\`, \`category_filter\`, \`subtotal\`, \`discount_total\`, \`taxable_total\`,
             \`cgst_total\`, \`sgst_total\`, \`igst_total\`, \`round_off\`, \`grand_total\`, \`paid_total\`, \`due_total\`,
             \`payment_status\`, \`status\`, \`created_by\`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                invoiceNo, customerId || null, categoryFilter || "ALL", subtotal, discountTotal, taxableTotal,
                cgstTotal, sgstTotal, igstTotal, roundOff, grandTotal, paidTotal, dueTotal,
                paymentStatus, status || "COMPLETED", createdBy
            ]
        );
        return result.insertId;
    }

    static async createSaleItem(itemData, conn) {
        const {
            saleId, productId, productNameSnapshot, skuSnapshot, hsnSnapshot, unitSnapshot,
            qty, unitPrice, discount, taxRateSnapshot, taxableValue, taxAmount, lineTotal
        } = itemData;

        await conn.query(
            `INSERT INTO \`sale_items\`
            (\`sale_id\`, \`product_id\`, \`product_name_snapshot\`, \`sku_snapshot\`, \`hsn_snapshot\`, \`unit_snapshot\`,
             \`qty\`, \`unit_price\`, \`discount\`, \`tax_rate_snapshot\`, \`taxable_value\`, \`tax_amount\`, \`line_total\`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                saleId, productId, productNameSnapshot, skuSnapshot, hsnSnapshot || null, unitSnapshot,
                qty, unitPrice, discount, taxRateSnapshot, taxableValue, taxAmount, lineTotal
            ]
        );
    }

    static async createSaleReturn({ saleId, returnNo, totalRefund, reason, createdBy }, conn) {
        const [result] = await conn.query(
            `INSERT INTO \`sale_returns\` (\`sale_id\`, \`return_no\`, \`total_refund\`, \`reason\`, \`created_by\`)
             VALUES (?, ?, ?, ?, ?)`,
            [saleId, returnNo, totalRefund, reason, createdBy]
        );
        return result.insertId;
    }

    static async createSaleReturnItem({ returnId, productId, qty, refundAmount, lineTotal }, conn) {
        await conn.query(
            `INSERT INTO \`sale_return_items\` (\`return_id\`, \`product_id\`, \`qty\`, \`refund_amount\`, \`line_total\`)
             VALUES (?, ?, ?, ?, ?)`,
            [returnId, productId, qty, refundAmount, lineTotal]
        );
    }
}

module.exports = SaleRepository;
