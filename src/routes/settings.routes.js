const express = require("express");
const asyncHandler = require("../utils/async-handler");
const validate = require("../middleware/validate");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { updateSettingsSchema } = require("../validators/settings.validator");
const { getSettings, updateSettings } = require("../controllers/settings.controller");

const router = express.Router();

router.get("/settings", authenticate, authorize("settings:read"), asyncHandler(getSettings));
router.patch("/settings", authenticate, authorize("settings:manage"), validate(updateSettingsSchema), asyncHandler(updateSettings));

module.exports = router;
