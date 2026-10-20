const AppError = require("../utils/app-error");

function authorize(requiredPermission) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError("Unauthenticated request.", 401, "UNAUTHENTICATED"));
        }

        if (req.user.role === "ADMIN") {
            return next();
        }

        if (req.user.permissions && req.user.permissions.has(requiredPermission)) {
            return next();
        }

        return next(new AppError(`Forbidden. Permission required: ${requiredPermission}`, 403, "FORBIDDEN"));
    };
}

module.exports = authorize;
