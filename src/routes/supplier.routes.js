const express = require("express");
const asyncHandler = require("../utils/async-handler");
const validate = require("../middleware/validate");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { createSupplierSchema, updateSupplierSchema } = require("../validators/supplier.validator");
const { listSuppliers, getSupplier, createSupplier, updateSupplier } = require("../controllers/supplier.controller");

const router = express.Router();

router.get("/suppliers", authenticate, authorize("purchases:read"), asyncHandler(listSuppliers));
router.post("/suppliers", authenticate, authorize("purchases:create"), validate(createSupplierSchema), asyncHandler(createSupplier));
router.get("/suppliers/:id", authenticate, authorize("purchases:read"), asyncHandler(getSupplier));
router.patch("/suppliers/:id", authenticate, authorize("purchases:create"), validate(updateSupplierSchema), asyncHandler(updateSupplier));

module.exports = router;
