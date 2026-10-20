const AppError = require("../utils/app-error");

function validate(schema, source = "body") {
    return (req, res, next) => {
        if (!schema || typeof schema.safeParse !== "function") {
            return next(new AppError("Internal error: Invalid validation schema passed", 500, "INTERNAL_SCHEMA_ERROR"));
        }

        const dataToValidate = req[source] || {};
        const result = schema.safeParse(dataToValidate);

        if (!result.success) {
            const formattedErrors = result.error.issues.map(issue => ({
                field: issue.path.join("."),
                message: issue.message
            }));

            return next(new AppError("Request validation failed", 400, "VALIDATION_ERROR", formattedErrors));
        }

        req[source] = result.data;
        next();
    };
}

module.exports = validate;
