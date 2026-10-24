const express = require("express");
const asyncHandler = require("../utils/async-handler");
const validate = require("../middleware/validate");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { createUnitSchema, createGstRateSchema } = require("../validators/product.validator");
const { listUnits, createUnit, listGstRates, createGstRate } = require("../controllers/reference-data.controller");

const router = express.Router();

// Units
router.get("/units", authenticate, authorize("products:read"), asyncHandler(listUnits));
router.post("/units", authenticate, authorize("products:create"), validate(createUnitSchema), asyncHandler(createUnit));

// GST Rates
router.get("/gst-rates", authenticate, authorize("products:read"), asyncHandler(listGstRates));
router.post("/gst-rates", authenticate, authorize("products:create"), validate(createGstRateSchema), asyncHandler(createGstRate));

module.exports = router;
