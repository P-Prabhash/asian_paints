const AppError = require("../utils/app-error");
const SupplierRepository = require("../repositories/supplier.repository");
const AuditRepository = require("../repositories/audit.repository");

class SupplierService {
    static async listSuppliers(options) {
        return SupplierRepository.listSuppliers(options);
    }

    static async getSupplierById(id) {
        const supplier = await SupplierRepository.findById(id);
        if (!supplier) throw new AppError("Supplier not found", 404, "SUPPLIER_NOT_FOUND");
        return supplier;
    }

    static async createSupplier(supplierData, actorId) {
        if (supplierData.supplierCode && await SupplierRepository.findByCode(supplierData.supplierCode)) {
            throw new AppError("Supplier ID already exists", 409, "SUPPLIER_CODE_EXISTS");
        }

        let newId;
        try {
            newId = await SupplierRepository.createSupplier(supplierData);
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY" && supplierData.supplierCode) {
                throw new AppError("Supplier ID already exists", 409, "SUPPLIER_CODE_EXISTS");
            }
            throw error;
        }

        await AuditRepository.createLog({
            userId: actorId,
            action: "SUPPLIER_CREATED",
            entityType: "SUPPLIER",
            entityId: newId,
            metadata: { name: supplierData.name }
        });

        return this.getSupplierById(newId);
    }

    static async updateSupplier(id, updates, actorId) {
        const supplier = await SupplierRepository.findById(id);
        if (!supplier) throw new AppError("Supplier not found", 404, "SUPPLIER_NOT_FOUND");

        if (updates.supplierCode && updates.supplierCode !== supplier.supplier_code) {
            const existing = await SupplierRepository.findByCode(updates.supplierCode);
            if (existing && existing.id !== id) throw new AppError("Supplier ID already exists", 409, "SUPPLIER_CODE_EXISTS");
        }

        try {
            await SupplierRepository.updateSupplier(id, updates);
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY" && updates.supplierCode) {
                throw new AppError("Supplier ID already exists", 409, "SUPPLIER_CODE_EXISTS");
            }
            throw error;
        }

        await AuditRepository.createLog({
            userId: actorId,
            action: "SUPPLIER_UPDATED",
            entityType: "SUPPLIER",
            entityId: id,
            metadata: { updatedFields: Object.keys(updates) }
        });

        return this.getSupplierById(id);
    }
}

module.exports = SupplierService;
