const bcrypt = require("bcrypt");
const AppError = require("../utils/app-error");
const UserRepository = require("../repositories/user.repository");
const RoleRepository = require("../repositories/role.repository");
const PermissionRepository = require("../repositories/permission.repository");
const AuditRepository = require("../repositories/audit.repository");

class UserService {
    static async listUsers(options) {
        return UserRepository.listUsers(options);
    }

    static async getUserById(id) {
        const user = await UserRepository.findById(id);
        if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

        const permissions = await UserRepository.getUserPermissions(user.id, user.role_id);
        return { ...user, permissions };
    }

    static async createUser(userData, actorId) {
        const existing = await UserRepository.findByUsernameOrEmail(userData.username);
        if (existing) throw new AppError("Username already exists", 409, "USERNAME_EXISTS");

        const role = await RoleRepository.findById(userData.roleId);
        if (!role) throw new AppError("Specified role does not exist", 400, "INVALID_ROLE");

        const passwordHash = await bcrypt.hash(userData.password, 10);

        const newId = await UserRepository.createUser({
            name: userData.name,
            username: userData.username,
            email: userData.email,
            passwordHash,
            roleId: userData.roleId,
            isActive: userData.isActive ?? true
        });

        await AuditRepository.createLog({
            userId: actorId,
            action: "USER_CREATED",
            entityType: "USER",
            entityId: newId,
            metadata: { username: userData.username, role: role.role_name }
        });

        return this.getUserById(newId);
    }

    static async updateUser(id, updates, actorId) {
        const user = await UserRepository.findById(id);
        if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

        const updateData = {};
        if (updates.name) updateData.name = updates.name;
        if (updates.username) updateData.username = updates.username;
        if (updates.email !== undefined) updateData.email = updates.email;
        if (updates.roleId) {
            const role = await RoleRepository.findById(updates.roleId);
            if (!role) throw new AppError("Invalid role ID", 400, "INVALID_ROLE");
            updateData.roleId = updates.roleId;
        }
        if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
        if (updates.password) {
            updateData.passwordHash = await bcrypt.hash(updates.password, 10);
        }

        await UserRepository.updateUser(id, updateData);

        await AuditRepository.createLog({
            userId: actorId,
            action: "USER_UPDATED",
            entityType: "USER",
            entityId: id,
            metadata: { updatedFields: Object.keys(updateData) }
        });

        return this.getUserById(id);
    }

    static async deleteUser(id, actorId) {
        const user = await UserRepository.findById(id);
        if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

        if (user.role_name === "ADMIN") {
            const adminCount = await UserRepository.countAdmins();
            if (adminCount <= 1) {
                throw new AppError("Cannot delete the only remaining admin user", 400, "CANNOT_DELETE_LAST_ADMIN");
            }
        }

        await UserRepository.deleteUser(id);

        await AuditRepository.createLog({
            userId: actorId,
            action: "USER_DELETED",
            entityType: "USER",
            entityId: id,
            metadata: { username: user.username }
        });

        return true;
    }

    static async listRoles() {
        return RoleRepository.listRoles();
    }

    static async createRole(roleData, actorId) {
        const newId = await RoleRepository.createRole(roleData);
        await AuditRepository.createLog({
            userId: actorId,
            action: "ROLE_CREATED",
            entityType: "ROLE",
            entityId: newId,
            metadata: roleData
        });
        return RoleRepository.findById(newId);
    }

    static async getRolePermissions(roleId) {
        const role = await RoleRepository.findById(roleId);
        if (!role) throw new AppError("Role not found", 404, "ROLE_NOT_FOUND");

        const permissions = await RoleRepository.getRolePermissions(roleId);
        return { role, permissions };
    }

    static async updateRolePermissions(roleId, permissionIds, actorId) {
        const role = await RoleRepository.findById(roleId);
        if (!role) throw new AppError("Role not found", 404, "ROLE_NOT_FOUND");

        await RoleRepository.updateRolePermissions(roleId, permissionIds);

        await AuditRepository.createLog({
            userId: actorId,
            action: "ROLE_PERMISSIONS_UPDATED",
            entityType: "ROLE",
            entityId: roleId,
            metadata: { permissionCount: permissionIds.length }
        });

        return this.getRolePermissions(roleId);
    }

    static async listPermissions() {
        return PermissionRepository.listPermissions();
    }
}

module.exports = UserService;
