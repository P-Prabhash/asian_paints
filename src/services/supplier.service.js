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
        const newId = await SupplierRepository.createSupplier(supplierData);

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

        await SupplierRepository.updateSupplier(id, updates);

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
