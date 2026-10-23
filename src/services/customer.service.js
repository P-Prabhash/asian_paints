const AppError = require("../utils/app-error");
const { withTransaction } = require("../config/database");
const CustomerRepository = require("../repositories/customer.repository");
const PaymentRepository = require("../repositories/payment.repository");
const AuditRepository = require("../repositories/audit.repository");
const { getNextSequenceNumber } = require("../utils/invoice-number");

class CustomerService {
    static async listCustomers(options) {
        return CustomerRepository.listCustomers(options);
    }

    static async getCustomerById(id) {
        const customer = await CustomerRepository.findById(id);
        if (!customer) throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
        return customer;
    }

    static async createCustomer(customerData, actorId) {
        if (customerData.mobile) {
            const existing = await CustomerRepository.findByMobile(customerData.mobile);
            if (existing) throw new AppError("Customer with this mobile number already exists", 409, "MOBILE_EXISTS");
        }

        if (customerData.customerCode) {
            const existing = await CustomerRepository.findByCode(customerData.customerCode);
            if (existing) throw new AppError("Customer code already exists", 409, "CUSTOMER_CODE_EXISTS");
        }

        let newId;
        try {
            newId = await CustomerRepository.createCustomer(customerData);
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
                throw new AppError("Customer code already exists", 409, "CUSTOMER_CODE_EXISTS");
            }
            throw error;
        }

        await AuditRepository.createLog({
            userId: actorId,
            action: "CUSTOMER_CREATED",
            entityType: "CUSTOMER",
            entityId: newId,
            metadata: {
                name: customerData.name,
                customerCode: customerData.customerCode,
                mobile: customerData.mobile
            }
        });

        return this.getCustomerById(newId);
    }

    static async updateCustomer(id, updates, actorId) {
        const customer = await CustomerRepository.findById(id);
        if (!customer) throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");

        if (updates.mobile && updates.mobile !== customer.mobile) {
            const existing = await CustomerRepository.findByMobile(updates.mobile);
            if (existing && existing.id !== id) {
                throw new AppError("Customer with this mobile number already exists", 409, "MOBILE_EXISTS");
            }
        }

        if (updates.customerCode && updates.customerCode !== customer.customer_code) {
            const existing = await CustomerRepository.findByCode(updates.customerCode);
            if (existing && existing.id !== id) {
                throw new AppError("Customer code already exists", 409, "CUSTOMER_CODE_EXISTS");
            }
        }

        await CustomerRepository.updateCustomer(id, updates);

        await AuditRepository.createLog({
            userId: actorId,
            action: "CUSTOMER_UPDATED",
            entityType: "CUSTOMER",
            entityId: id,
            metadata: { updatedFields: Object.keys(updates) }
        });

        return this.getCustomerById(id);
    }

    static async getCustomerLedger(customerId, options) {
        const customer = await CustomerRepository.findById(customerId);
        if (!customer) throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");

        const ledgerResult = await CustomerRepository.getLedger(customerId, options);
        return { customer, ...ledgerResult };
    }

    static async collectPayment(customerId, collectionData, actorId) {
        return withTransaction(async (conn) => {
            const customer = await CustomerRepository.findById(customerId, conn);
            if (!customer) throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");

            const { amount, paymentMethod, referenceNo, notes } = collectionData;

            const receiptNo = await getNextSequenceNumber(conn, "receipt_next_number", "REC-");

            const paymentId = await PaymentRepository.createPayment({
                saleId: null,
                customerId,
                method: paymentMethod,
                amount,
                referenceNo,
                notes,
                receivedBy: actorId
            }, conn);

            await CustomerRepository.updateBalance(customerId, -amount, conn);

            const updatedCustomer = await CustomerRepository.findById(customerId, conn);

            await CustomerRepository.addLedgerEntry({
                customerId,
                saleId: null,
                paymentId,
                entryType: "PAYMENT_COLLECTION",
                debit: 0,
                credit: amount,
                balanceAfter: updatedCustomer.current_balance,
                notes: `Collection Receipt ${receiptNo}`
            }, conn);

            const receiptId = await PaymentRepository.createCollectionReceipt({
                receiptNo,
                customerId,
                paymentId,
                amount,
                paymentMethod,
                referenceNo,
                notes,
                createdBy: actorId
            }, conn);

            await AuditRepository.createLog({
                userId: actorId,
                action: "CREDIT_COLLECTION_RECEIPT",
                entityType: "COLLECTION",
                entityId: receiptId,
                metadata: { receiptNo, customerId, amount, paymentMethod }
            }, conn);

            return {
                receiptId,
                receiptNo,
                customerId,
                customerName: customer.name,
                amountCollected: amount,
                previousBalance: customer.current_balance,
                newBalance: updatedCustomer.current_balance
            };
        });
    }
}

module.exports = CustomerService;
