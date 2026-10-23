const { pool } = require("../config/database");

class CustomerRepository {
    static async listCustomers({ search, limit = 50, offset = 0 } = {}) {
        let where = ["1=1"];
        const params = [];

        if (search) {
            where.push("(`name` LIKE ? OR `mobile` LIKE ? OR `gstin` LIKE ?)");
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        const query = `SELECT * FROM \`customers\` WHERE ${where.join(" AND ")} ORDER BY \`id\` DESC LIMIT ? OFFSET ?`;
        const countQuery = `SELECT COUNT(*) as total FROM \`customers\` WHERE ${where.join(" AND ")}`;

        const [rows] = await pool.query(query, [...params, limit, offset]);
        const [countRows] = await pool.query(countQuery, params);

        return { customers: rows, total: countRows[0].total };
    }

    static async findById(id, conn = pool) {
        const [rows] = await conn.query("SELECT * FROM `customers` WHERE `id` = ? LIMIT 1", [id]);
        return rows[0] || null;
    }

    static async findByMobile(mobile) {
        if (!mobile) return null;
        const [rows] = await pool.query("SELECT * FROM `customers` WHERE `mobile` = ? LIMIT 1", [mobile]);
        return rows[0] || null;
    }

    static async findByCode(customerCode) {
        if (!customerCode) return null;
        const [rows] = await pool.query("SELECT * FROM `customers` WHERE `customer_code` = ? LIMIT 1", [customerCode]);
        return rows[0] || null;
    }

    static async createCustomer(customerData, conn = pool) {
        const {
            name, customerCode, mobile, alternatePhone, email, addressLine, address,
            city, state, pinCode, country, gstin, pan, customerType,
            openingBalance = 0, creditLimit = 0, paymentTerms, notes, active = true
        } = customerData;
        const fullAddress = addressLine ?? address ?? null;

        const [result] = await conn.query(
            `INSERT INTO \`customers\`
             (\`name\`, \`customer_code\`, \`mobile\`, \`alternate_phone\`, \`email\`, \`address\`, \`address_line\`,
              \`city\`, \`state\`, \`pin_code\`, \`country\`, \`gstin\`, \`pan\`, \`customer_type\`,
              \`opening_balance\`, \`current_balance\`, \`credit_limit\`, \`payment_terms\`, \`notes\`, \`active\`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, customerCode || null, mobile || null, alternatePhone || null, email || null,
                fullAddress, fullAddress, city || null, state || null, pinCode || null, country || null,
                gstin || null, pan || null, customerType || null, openingBalance, openingBalance,
                creditLimit, paymentTerms || null, notes || null, active ? 1 : 0
            ]
        );
        return result.insertId;
    }

    static async updateCustomer(id, updates) {
        const fields = [];
        const values = [];

        if (updates.name !== undefined) { fields.push("`name` = ?"); values.push(updates.name); }
        if (updates.customerCode !== undefined) { fields.push("`customer_code` = ?"); values.push(updates.customerCode || null); }
        if (updates.mobile !== undefined) { fields.push("`mobile` = ?"); values.push(updates.mobile || null); }
        if (updates.alternatePhone !== undefined) { fields.push("`alternate_phone` = ?"); values.push(updates.alternatePhone || null); }
        if (updates.email !== undefined) { fields.push("`email` = ?"); values.push(updates.email || null); }
        if (updates.addressLine !== undefined || updates.address !== undefined) {
            const address = updates.addressLine ?? updates.address ?? null;
            fields.push("`address` = ?", "`address_line` = ?");
            values.push(address, address);
        }
        if (updates.city !== undefined) { fields.push("`city` = ?"); values.push(updates.city || null); }
        if (updates.state !== undefined) { fields.push("`state` = ?"); values.push(updates.state || null); }
        if (updates.pinCode !== undefined) { fields.push("`pin_code` = ?"); values.push(updates.pinCode || null); }
        if (updates.country !== undefined) { fields.push("`country` = ?"); values.push(updates.country || null); }
        if (updates.gstin !== undefined) { fields.push("`gstin` = ?"); values.push(updates.gstin || null); }
        if (updates.pan !== undefined) { fields.push("`pan` = ?"); values.push(updates.pan || null); }
        if (updates.customerType !== undefined) { fields.push("`customer_type` = ?"); values.push(updates.customerType || null); }
        if (updates.creditLimit !== undefined) { fields.push("`credit_limit` = ?"); values.push(updates.creditLimit); }
        if (updates.paymentTerms !== undefined) { fields.push("`payment_terms` = ?"); values.push(updates.paymentTerms || null); }
        if (updates.notes !== undefined) { fields.push("`notes` = ?"); values.push(updates.notes || null); }
        if (updates.active !== undefined) { fields.push("`active` = ?"); values.push(updates.active ? 1 : 0); }

        if (fields.length === 0) return false;

        values.push(id);
        const [result] = await pool.query(
            `UPDATE \`customers\` SET ${fields.join(", ")} WHERE \`id\` = ?`,
            values
        );
        return result.affectedRows > 0;
    }

    static async updateBalance(id, amountChange, conn = pool) {
        await conn.query("UPDATE `customers` SET `current_balance` = `current_balance` + ? WHERE `id` = ?", [amountChange, id]);
    }

    static async getLedger(customerId, { limit = 50, offset = 0 } = {}) {
        const query = `
            SELECT l.*, s.\`invoice_no\`, p.\`method\` as payment_method, p.\`reference_no\`
            FROM \`customer_ledger\` l
            LEFT JOIN \`sales\` s ON l.\`sale_id\` = s.\`id\`
            LEFT JOIN \`payments\` p ON l.\`payment_id\` = p.\`id\`
            WHERE l.\`customer_id\` = ?
            ORDER BY l.\`id\` DESC
            LIMIT ? OFFSET ?
        `;
        const countQuery = "SELECT COUNT(*) as total FROM `customer_ledger` WHERE `customer_id` = ?";

        const [rows] = await pool.query(query, [customerId, limit, offset]);
        const [countRows] = await pool.query(countQuery, [customerId]);

        return { ledger: rows, total: countRows[0].total };
    }

    static async addLedgerEntry({ customerId, saleId, paymentId, entryType, debit = 0, credit = 0, balanceAfter, notes }, conn = pool) {
        const [result] = await conn.query(
            `INSERT INTO \`customer_ledger\`
             (\`customer_id\`, \`sale_id\`, \`payment_id\`, \`entry_type\`, \`debit\`, \`credit\`, \`balance_after\`, \`notes\`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [customerId, saleId || null, paymentId || null, entryType, debit, credit, balanceAfter, notes || null]
        );
        return result.insertId;
    }
}

module.exports = CustomerRepository;
