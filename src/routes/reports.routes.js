const express = require("express");
const asyncHandler = require("../utils/async-handler");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { getDashboardSummary, getSalesReport, getProductSalesReport, getGstReport, getReceivablesReport } = require("../controllers/reports.controller");

const router = express.Router();

router.get("/reports/dashboard", authenticate, authorize("dashboard:read"), asyncHandler(getDashboardSummary));
router.get("/reports/sales", authenticate, authorize("reports:read"), asyncHandler(getSalesReport));
router.get("/reports/products", authenticate, authorize("reports:read"), asyncHandler(getProductSalesReport));
router.get("/reports/gst", authenticate, authorize("reports:read"), asyncHandler(getGstReport));
router.get("/reports/purchases", authenticate, authorize("reports:read"), asyncHandler(getSalesReport));
router.get("/reports/stock", authenticate, authorize("reports:read"), asyncHandler(getProductSalesReport));
router.get("/reports/receivables", authenticate, authorize("reports:read"), asyncHandler(getReceivablesReport));

module.exports = router;
