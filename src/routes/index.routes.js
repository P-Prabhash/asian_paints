const express = require("express");
const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const productRoutes = require("./product.routes");
const categoryRoutes = require("./category.routes");
const customerRoutes = require("./customer.routes");
const supplierRoutes = require("./supplier.routes");
const purchaseRoutes = require("./purchase.routes");
const billingRoutes = require("./billing.routes");
const saleRoutes = require("./sale.routes");
const paymentRoutes = require("./payment.routes");
const inventoryRoutes = require("./inventory.routes");
const reportsRoutes = require("./reports.routes");
const settingsRoutes = require("./settings.routes");
const backupRoutes = require("./backup.routes");
const auditRoutes = require("./audit.routes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/", userRoutes);
router.use("/", productRoutes);
router.use("/", categoryRoutes);
router.use("/", customerRoutes);
router.use("/", supplierRoutes);
router.use("/", purchaseRoutes);
router.use("/", billingRoutes);
router.use("/", saleRoutes);
router.use("/", paymentRoutes);
router.use("/", inventoryRoutes);
router.use("/", reportsRoutes);
router.use("/", settingsRoutes);
router.use("/", backupRoutes);
router.use("/", auditRoutes);

module.exports = router;
