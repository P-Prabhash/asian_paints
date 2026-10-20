const express = require("express");
const asyncHandler = require("../utils/async-handler");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { createBackup, listBackups, restoreBackup } = require("../controllers/backup.controller");

const router = express.Router();

router.post("/backups", authenticate, authorize("backup:create"), asyncHandler(createBackup));
router.get("/backups", authenticate, authorize("backup:create"), asyncHandler(listBackups));
router.post("/backups/:id/restore", authenticate, authorize("backup:restore"), asyncHandler(restoreBackup));

module.exports = router;
