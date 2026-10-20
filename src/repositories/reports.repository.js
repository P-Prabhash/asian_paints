const { pool } = require("../config/database");

class ReportsRepository {
    static async getDashboardSummary() {
        const today = new Date().toISOString().split("T")[0];

        const [salesRows] = await pool.query(
            "SELECT COUNT(*) as invoice_count, COALESCE(SUM(`grand_total`), 0) as today_sales, COALESCE(SUM(`paid_total`), 0) as today_collections, COALESCE(SUM(`due_total`), 0) as today_credit FROM `sales` WHERE DATE(`created_at`) = ?",
            [today]
        );

        const [creditRows] = await pool.query(
            "SELECT COALESCE(SUM(`current_balance`), 0) as total_credit_due FROM `customers` WHERE `current_balance` > 0"
        );

        const [stockRows] = await pool.query(
            "SELECT COUNT(*) as low_stock_count FROM `products` WHERE `active` = 1 AND `stock_qty` <= `reorder_level`"
        );

        const [purchaseRows] = await pool.query(
            "SELECT COALESCE(SUM(`grand_total`), 0) as today_purchases FROM `purchases` WHERE DATE(`created_at`) = ?",
            [today]
        );

        const [trendRows] = await pool.query(`
            SELECT DATE(\`created_at\`) as date, COUNT(*) as invoice_count, COALESCE(SUM(\`grand_total\`), 0) as total_sales
            FROM \`sales\`
            WHERE \`created_at\` >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(\`created_at\`)
            ORDER BY date ASC
        `);

        return {
            today: {
                date: today,
                invoiceCount: salesRows[0].invoice_count,
                todaySales: salesRows[0].today_sales,
                todayCollections: salesRows[0].today_collections,
                todayCredit: salesRows[0].today_credit,
                todayPurchases: purchaseRows[0].today_purchases
            },
            totalCreditDue: creditRows[0].total_credit_due,
            lowStockCount: stockRows[0].low_stock_count,
            salesTrend: trendRows
        };
    }

    static async getSalesReport({ startDate, endDate }) {
        const [rows] = await pool.query(`
            SELECT DATE(\`created_at\`) as date,
                   COUNT(*) as invoice_count,
                   COALESCE(SUM(\`subtotal\`), 0) as subtotal,
                   COALESCE(SUM(\`discount_total\`), 0) as discount_total,
                   COALESCE(SUM(\`taxable_total\`), 0) as taxable_total,
                   COALESCE(SUM(\`cgst_total\` + \`sgst_total\` + \`igst_total\`), 0) as total_tax,
                   COALESCE(SUM(\`grand_total\`), 0) as grand_total,
                   COALESCE(SUM(\`paid_total\`), 0) as paid_total,
                   COALESCE(SUM(\`due_total\`), 0) as due_total
            FROM \`sales\`
            WHERE \`created_at\` BETWEEN ? AND ?
            GROUP BY DATE(\`created_at\`)
            ORDER BY date DESC
        `, [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);

        return rows;
    }

    static async getProductSalesReport({ startDate, endDate }) {
        const [rows] = await pool.query(`
            SELECT si.\`product_id\`, si.\`product_name_snapshot\` as product_name, si.\`sku_snapshot\` as sku,
                   c.\`name\` as category_name,
                   SUM(si.\`qty\`) as total_qty,
                   SUM(si.\`taxable_value\`) as taxable_value,
                   SUM(si.\`tax_amount\`) as tax_amount,
                   SUM(si.\`line_total\`) as total_revenue
            FROM \`sale_items\` si
            JOIN \`sales\` s ON si.\`sale_id\` = s.\`id\`
            JOIN \`products\` p ON si.\`product_id\` = p.\`id\`
            JOIN \`categories\` c ON p.\`category_id\` = c.\`id\`
            WHERE s.\`created_at\` BETWEEN ? AND ?
            GROUP BY si.\`product_id\`, si.\`product_name_snapshot\`, si.\`sku_snapshot\`, c.\`name\`
            ORDER BY total_revenue DESC
        `, [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);

        return rows;
    }

    static async getGstReport({ startDate, endDate }) {
        const [rows] = await pool.query(`
            SELECT si.\`tax_rate_snapshot\` as gst_rate,
                   SUM(si.\`taxable_value\`) as taxable_value,
                   SUM(si.\`tax_amount\`) as tax_amount,
                   SUM(CASE WHEN s.\`igst_total\` = 0 THEN si.\`tax_amount\` / 2 ELSE 0 END) as cgst,
                   SUM(CASE WHEN s.\`igst_total\` = 0 THEN si.\`tax_amount\` / 2 ELSE 0 END) as sgst,
                   SUM(CASE WHEN s.\`igst_total\` > 0 THEN si.\`tax_amount\` ELSE 0 END) as igst
            FROM \`sale_items\` si
            JOIN \`sales\` s ON si.\`sale_id\` = s.\`id\`
            WHERE s.\`created_at\` BETWEEN ? AND ?
            GROUP BY si.\`tax_rate_snapshot\`
            ORDER BY gst_rate ASC
        `, [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);

        return rows;
    }

    static async getReceivablesReport() {
        const [rows] = await pool.query(`
            SELECT id, name, mobile, address, gstin, current_balance, updated_at as last_activity
            FROM \`customers\`
            WHERE current_balance > 0
            ORDER BY current_balance DESC
        `);
        return rows;
    }
}

module.exports = ReportsRepository;
