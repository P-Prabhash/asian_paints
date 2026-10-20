const { z } = require("zod");

const createUserSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email").optional().nullable(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    roleId: z.number().int().positive("Valid role ID is required"),
    isActive: z.boolean().optional().default(true)
});

const updateUserSchema = z.object({
    name: z.string().min(2).optional(),
    username: z.string().min(3).optional(),
    email: z.string().email().optional().nullable(),
    password: z.string().min(6).optional(),
    roleId: z.number().int().positive().optional(),
    isActive: z.boolean().optional()
});

const createRoleSchema = z.object({
    roleName: z.string().min(2, "Role name must be at least 2 characters"),
    description: z.string().optional()
});

const updateRolePermissionsSchema = z.object({
    permissionIds: z.array(z.number().int().positive())
});

module.exports = {
    createUserSchema,
    updateUserSchema,
    createRoleSchema,
    updateRolePermissionsSchema
};
