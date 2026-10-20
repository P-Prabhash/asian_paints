const express = require("express");
const asyncHandler = require("../utils/async-handler");
const validate = require("../middleware/validate");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { createProductSchema, updateProductSchema, productLookupQuerySchema } = require("../validators/product.validator");
const { lookupProduct, listProducts, getProduct, createProduct, updateProduct } = require("../controllers/product.controller");

const router = express.Router();

// CRITICAL ROUTE ORDERING: /lookup BEFORE /:id
router.get("/products/lookup", authenticate, authorize("products:read"), validate(productLookupQuerySchema, "query"), asyncHandler(lookupProduct));

router.get("/products", authenticate, authorize("products:read"), asyncHandler(listProducts));
router.post("/products", authenticate, authorize("products:create"), validate(createProductSchema), asyncHandler(createProduct));
router.get("/products/:id", authenticate, authorize("products:read"), asyncHandler(getProduct));
router.patch("/products/:id", authenticate, authorize("products:update"), validate(updateProductSchema), asyncHandler(updateProduct));

module.exports = router;
