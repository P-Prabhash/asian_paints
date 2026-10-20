const express = require("express");
const asyncHandler = require("../utils/async-handler");
const validate = require("../middleware/validate");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { createCustomerSchema, updateCustomerSchema, collectPaymentSchema } = require("../validators/customer.validator");
const { listCustomers, getCustomer, createCustomer, updateCustomer, getCustomerLedger, collectPayment } = require("../controllers/customer.controller");

const router = express.Router();

router.get("/customers", authenticate, authorize("customers:read"), asyncHandler(listCustomers));
router.post("/customers", authenticate, authorize("customers:create"), validate(createCustomerSchema), asyncHandler(createCustomer));
router.get("/customers/:id", authenticate, authorize("customers:read"), asyncHandler(getCustomer));
router.patch("/customers/:id", authenticate, authorize("customers:update"), validate(updateCustomerSchema), asyncHandler(updateCustomer));
router.get("/customers/:id/ledger", authenticate, authorize("customers:read"), asyncHandler(getCustomerLedger));
router.post("/customers/:id/collections", authenticate, authorize("payments:collect"), validate(collectPaymentSchema), asyncHandler(collectPayment));

module.exports = router;
