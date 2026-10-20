const express = require("express");
const asyncHandler = require("../utils/async-handler");
const validate = require("../middleware/validate");
const authenticate = require("../middleware/authenticate");
const { loginLimiter } = require("../middleware/rate-limit");
const { firstRunAdminSchema, loginSchema } = require("../validators/auth.validator");
const { firstRunAdmin, login, logout, getMe } = require("../controllers/auth.controller");

const router = express.Router();

router.post("/first-run-admin", validate(firstRunAdminSchema), asyncHandler(firstRunAdmin));
router.post("/login", loginLimiter, validate(loginSchema), asyncHandler(login));
router.post("/logout", authenticate, asyncHandler(logout));
router.get("/me", authenticate, asyncHandler(getMe));

module.exports = router;
