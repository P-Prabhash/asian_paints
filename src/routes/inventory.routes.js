const express = require("express");
const asyncHandler = require("../utils/async-handler");
const validate = require("../middleware/validate");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { stockAdjustmentSchema } = require("../validators/inventory.validator");
const { listStock, listMovements, adjustStock } = require("../controllers/inventory.controller");

const router = express.Router();

router.get("/stock", authenticate, authorize("stock:read"), asyncHandler(listStock));
router.get("/stock/movements", authenticate, authorize("stock:read"), asyncHandler(listMovements));
router.post("/stock/adjustments", authenticate, authorize("stock:adjust"), validate(stockAdjustmentSchema), asyncHandler(adjustStock));

module.exports = router;
