const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const env = require("../config/env");
const AppError = require("../utils/app-error");
const UserRepository = require("../repositories/user.repository");
const RevokedTokenRepository = require("../repositories/revoked-token.repository");
const AuditRepository = require("../repositories/audit.repository");

class AuthService {
    static async createFirstRunAdmin({ name, username, email, password }) {
        const adminCount = await UserRepository.countAdmins();
        if (adminCount > 0) {
            throw new AppError("First-run admin creation is disabled because an administrator already exists.", 403, "ADMIN_EXISTS");
        }

        const existingUser = await UserRepository.findByUsernameOrEmail(username);
        if (existingUser) {
            throw new AppError("Username already exists.", 409, "USERNAME_EXISTS");
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const userId = await UserRepository.createUser({
            name,
            username,
            email: email || null,
            passwordHash,
            roleId: 1, // ADMIN
            isActive: true
        });

        await AuditRepository.createLog({
            userId,
            action: "FIRST_RUN_ADMIN_CREATED",
            entityType: "USER",
            entityId: userId,
            metadata: { username }
        });

        const user = await UserRepository.findById(userId);
        return user;
    }

    static async login({ username, password }, ipAddress = null) {
        const user = await UserRepository.findByUsernameOrEmail(username);
        if (!user) {
            throw new AppError("Invalid username or password.", 401, "INVALID_CREDENTIALS");
        }

        if (!user.is_active) {
            throw new AppError("Account is inactive. Please contact system administrator.", 403, "ACCOUNT_INACTIVE");
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            throw new AppError("Invalid username or password.", 401, "INVALID_CREDENTIALS");
        }

        await UserRepository.updateLastLogin(user.id);

        const permissions = await UserRepository.getUserPermissions(user.id, user.role_id);

        const jti = crypto.randomUUID();
        const payload = {
            sub: user.id,
            username: user.username,
            role: user.role_name,
            jti
        };

        const accessToken = jwt.sign(payload, env.jwtSecret, {
            expiresIn: env.jwtExpiresIn
        });

        await AuditRepository.createLog({
            userId: user.id,
            action: "USER_LOGIN_SUCCESS",
            entityType: "AUTH",
            entityId: user.id,
            ipAddress
        });

        return {
            accessToken,
            tokenType: "Bearer",
            expiresIn: env.jwtExpiresIn,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role_name,
                permissions
            }
        };
    }

    static async logout(user) {
        if (user.jti && user.exp) {
            const expiresAt = new Date(user.exp * 1000);
            await RevokedTokenRepository.revokeToken({
                jti: user.jti,
                userId: user.id,
                expiresAt
            });
        }

        await AuditRepository.createLog({
            userId: user.id,
            action: "USER_LOGOUT",
            entityType: "AUTH",
            entityId: user.id
        });

        return true;
    }

    static async getMe(userId) {
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw new AppError("User not found.", 404, "USER_NOT_FOUND");
        }

        const permissions = await UserRepository.getUserPermissions(user.id, user.role_id);

        return {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            roleId: user.role_id,
            role: user.role_name,
            isActive: Boolean(user.is_active),
            lastLoginAt: user.last_login_at,
            permissions
        };
    }
}

module.exports = AuthService;
