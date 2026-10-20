const express = require("express");
const asyncHandler = require("../utils/async-handler");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { listPayments } = require("../controllers/payment.controller");

const router = express.Router();

router.get("/payments", authenticate, authorize("payments:read"), asyncHandler(listPayments));

module.exports = router;
