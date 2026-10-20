const express = require("express");
const asyncHandler = require("../utils/async-handler");
const validate = require("../middleware/validate");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { createUserSchema, updateUserSchema, createRoleSchema, updateRolePermissionsSchema } = require("../validators/user.validator");
const { listUsers, getUser, createUser, updateUser, deleteUser } = require("../controllers/user.controller");
const { listRoles, createRole, getRolePermissions, updateRolePermissions } = require("../controllers/role.controller");

const router = express.Router();

// User endpoints
router.get("/users", authenticate, authorize("users:manage"), asyncHandler(listUsers));
router.post("/users", authenticate, authorize("users:manage"), validate(createUserSchema), asyncHandler(createUser));
router.get("/users/:id", authenticate, authorize("users:manage"), asyncHandler(getUser));
router.patch("/users/:id", authenticate, authorize("users:manage"), validate(updateUserSchema), asyncHandler(updateUser));
router.delete("/users/:id", authenticate, authorize("users:manage"), asyncHandler(deleteUser));

// Role endpoints
router.get("/roles", authenticate, authorize("roles:manage"), asyncHandler(listRoles));
router.post("/roles", authenticate, authorize("roles:manage"), validate(createRoleSchema), asyncHandler(createRole));
router.get("/roles/:id/permissions", authenticate, authorize("roles:manage"), asyncHandler(getRolePermissions));
router.put("/roles/:id/permissions", authenticate, authorize("roles:manage"), validate(updateRolePermissionsSchema), asyncHandler(updateRolePermissions));

module.exports = router;
