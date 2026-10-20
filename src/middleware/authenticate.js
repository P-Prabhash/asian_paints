const jwt = require("jsonwebtoken");
const env = require("../config/env");
const AppError = require("../utils/app-error");
const UserRepository = require("../repositories/user.repository");
const RevokedTokenRepository = require("../repositories/revoked-token.repository");

async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(new AppError("Authentication required. Bearer token missing.", 401, "UNAUTHENTICATED"));
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return next(new AppError("Authentication required. Bearer token empty.", 401, "UNAUTHENTICATED"));
        }

        let decoded;
        try {
            decoded = jwt.verify(token, env.jwtSecret);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return next(new AppError("Token expired. Please login again.", 401, "TOKEN_EXPIRED"));
            }
            return next(new AppError("Invalid access token.", 401, "INVALID_TOKEN"));
        }

        if (decoded.jti) {
            const isRevoked = await RevokedTokenRepository.isRevoked(decoded.jti);
            if (isRevoked) {
                return next(new AppError("Token has been revoked.", 401, "TOKEN_REVOKED"));
            }
        }

        const user = await UserRepository.findById(decoded.sub);
        if (!user) {
            return next(new AppError("User account not found.", 401, "USER_NOT_FOUND"));
        }

        if (!user.is_active) {
            return next(new AppError("User account is inactive.", 403, "ACCOUNT_INACTIVE"));
        }

        const permissions = await UserRepository.getUserPermissions(user.id, user.role_id);

        req.user = {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            roleId: user.role_id,
            role: user.role_name,
            permissions: new Set(permissions),
            jti: decoded.jti,
            exp: decoded.exp
        };

        next();
    } catch (error) {
        next(error);
    }
}

module.exports = authenticate;
