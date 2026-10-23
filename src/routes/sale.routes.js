const express = require("express");
const asyncHandler = require("../utils/async-handler");
const validate = require("../middleware/validate");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { saleReturnSchema } = require("../validators/billing.validator");
const { listSales, getSale, getSaleReceipt, createReturn } = require("../controllers/sale.controller");

const router = express.Router();

router.get("/sales", authenticate, authorize("sales:read"), asyncHandler(listSales));
router.get("/sales/:id/receipt", authenticate, authorize("sales:read"), asyncHandler(getSaleReceipt));
router.get("/sales/:id", authenticate, authorize("sales:read"), asyncHandler(getSale));
router.post("/sales/:id/returns", authenticate, authorize("sales:return"), validate(saleReturnSchema), asyncHandler(createReturn));

module.exports = router;
