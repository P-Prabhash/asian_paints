const express = require("express");
const asyncHandler = require("../utils/async-handler");
const validate = require("../middleware/validate");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { billingProductsQuerySchema, quoteSchema, checkoutSchema } = require("../validators/billing.validator");
const { listProducts, quote, checkout } = require("../controllers/billing.controller");

const router = express.Router();

router.get("/billing/products", authenticate, authorize("billing:read"), validate(billingProductsQuerySchema, "query"), asyncHandler(listProducts));
router.post("/billing/quote", authenticate, authorize("billing:quote"), validate(quoteSchema), asyncHandler(quote));
router.post("/billing/checkout", authenticate, authorize("billing:checkout"), validate(checkoutSchema), asyncHandler(checkout));

module.exports = router;
