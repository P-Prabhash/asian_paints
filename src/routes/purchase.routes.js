const express = require("express");
const asyncHandler = require("../utils/async-handler");
const validate = require("../middleware/validate");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { createPurchaseSchema, purchaseIdParamSchema } = require("../validators/supplier.validator");
const { listPurchases, getPurchase, createPurchase, updatePurchase, deletePurchase } = require("../controllers/purchase.controller");

const router = express.Router();

router.get("/purchases", authenticate, authorize("purchases:read"), asyncHandler(listPurchases));
router.post("/purchases", authenticate, authorize("purchases:create"), validate(createPurchaseSchema), asyncHandler(createPurchase));
router.get("/purchases/:id", authenticate, authorize("purchases:read"), validate(purchaseIdParamSchema, "params"), asyncHandler(getPurchase));
router.put("/purchases/:id", authenticate, authorize("purchases:update"), validate(purchaseIdParamSchema, "params"), validate(createPurchaseSchema), asyncHandler(updatePurchase));
router.delete("/purchases/:id", authenticate, authorize("purchases:delete"), validate(purchaseIdParamSchema, "params"), asyncHandler(deletePurchase));

module.exports = router;
