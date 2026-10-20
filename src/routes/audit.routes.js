const express = require("express");
const asyncHandler = require("../utils/async-handler");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { listAuditLogs } = require("../controllers/audit.controller");

const router = express.Router();

router.get("/audit-logs", authenticate, authorize("audit:read"), asyncHandler(listAuditLogs));

module.exports = router;
