const AppError = require("../utils/app-error");
const withTransaction = require("../utils/transaction");
const CustomerRepository = require("../repositories/customer.repository");
const PaymentRepository = require("../repositories/payment.repository");
const AuditRepository = require("../repositories/audit.repository");

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

    static async deleteCustomer(id, actorId) {
        return withTransaction(async (conn) => {
            const customer = await CustomerRepository.findById(id, conn);
            if (!customer || !customer.active) {
                throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
            }

            const archived = await CustomerRepository.archiveCustomer(id, conn);
            if (!archived) {
                throw new AppError("Customer was already deleted", 404, "CUSTOMER_NOT_FOUND");
            }

            await AuditRepository.createLog({
                userId: actorId,
                action: "CUSTOMER_DELETED",
                entityType: "CUSTOMER",
                entityId: id,
                metadata: { name: customer.name, customerCode: customer.customer_code }
            }, conn);

            return {
                id,
                name: customer.name,
                customerCode: customer.customer_code,
                deleted: true
            };
        });
    }

    static async getCustomerLedger(customerId, options) {
        const customer = await CustomerRepository.findById(customerId);
        if (!customer) throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");

        const ledgerResult = await CustomerRepository.getLedger(customerId, options);
        return { customer, ...ledgerResult };
    }

    static async collectPayment(customerId, collectionData, actorId) {
        const { receiptNo, amount, paymentMethod, referenceNo, notes } = collectionData;
        if (typeof receiptNo !== "string" || !receiptNo.trim()) {
            throw new AppError("A manually entered receipt number is required", 400, "RECEIPT_NO_REQUIRED");
        }

        try {
            return await withTransaction(async (conn) => {
            const customer = await CustomerRepository.findById(customerId, conn);
            if (!customer) throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
            if (!customer.active) throw new AppError("Inactive customer cannot make a payment collection", 400, "CUSTOMER_INACTIVE");

            if (await PaymentRepository.findCollectionReceiptByNo(receiptNo, conn)) {
                throw new AppError("Receipt number already exists", 409, "RECEIPT_NO_EXISTS");
            }

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
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY" && await PaymentRepository.findCollectionReceiptByNo(receiptNo)) {
                throw new AppError("Receipt number already exists", 409, "RECEIPT_NO_EXISTS");
            }
            throw error;
        }
    }
}

module.exports = CustomerService;
