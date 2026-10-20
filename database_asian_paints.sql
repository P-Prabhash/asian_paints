-- =============================================================================
-- Paint Shop & Sunnam Bags ERP - Complete Database Dump & Setup Script
-- File Name: database_asian_paints.sql
-- Engine: MySQL 8.0+ | Engine: InnoDB | Character Set: utf8mb4_unicode_ci
-- =============================================================================

-- 1. Create Database Schema
CREATE DATABASE IF NOT EXISTS `paint_shop_dev`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `paint_shop_dev`;

SET FOREIGN_KEY_CHECKS = 0;

-- 2. Schema Migrations Table
DROP TABLE IF EXISTS `schema_migrations`;
CREATE TABLE `schema_migrations` (
    `version` VARCHAR(255) NOT NULL PRIMARY KEY,
    `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `checksum` VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Roles Table
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_name` VARCHAR(50) NOT NULL UNIQUE,
    `description` VARCHAR(255) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Permissions Table
DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `permission_key` VARCHAR(100) NOT NULL UNIQUE,
    `module` VARCHAR(50) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Role Permissions Table
DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
    `role_id` INT NOT NULL,
    `permission_id` INT NOT NULL,
    PRIMARY KEY (`role_id`, `permission_id`),
    CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rp_perm` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Users Table
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `email` VARCHAR(100) DEFAULT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role_id` INT NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `last_login_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. User Permissions Overrides Table
DROP TABLE IF EXISTS `user_permissions`;
CREATE TABLE `user_permissions` (
    `user_id` INT NOT NULL,
    `permission_id` INT NOT NULL,
    `allowed` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`user_id`, `permission_id`),
    CONSTRAINT `fk_up_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_up_perm` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Revoked Tokens Table
DROP TABLE IF EXISTS `revoked_tokens`;
CREATE TABLE `revoked_tokens` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `jti` VARCHAR(255) NOT NULL UNIQUE,
    `user_id` INT NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_rt_jti` (`jti`),
    CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Categories Table
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `description` VARCHAR(255) DEFAULT NULL,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Units Table
DROP TABLE IF EXISTS `units`;
CREATE TABLE `units` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(20) NOT NULL UNIQUE,
    `name` VARCHAR(50) NOT NULL,
    `base_unit_id` INT DEFAULT NULL,
    `conversion_factor` DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_units_base` FOREIGN KEY (`base_unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. GST Rates Table
DROP TABLE IF EXISTS `gst_rates`;
CREATE TABLE `gst_rates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `rate` DECIMAL(5, 2) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) DEFAULT NULL,
    `effective_from` DATE DEFAULT NULL,
    `effective_to` DATE DEFAULT NULL,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Products Table
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sku` VARCHAR(50) NOT NULL UNIQUE,
    `barcode` VARCHAR(100) DEFAULT NULL UNIQUE,
    `name` VARCHAR(150) NOT NULL,
    `category_id` INT NOT NULL,
    `brand` VARCHAR(100) DEFAULT NULL,
    `size` VARCHAR(50) DEFAULT NULL,
    `shade` VARCHAR(50) DEFAULT NULL,
    `hsn_code` VARCHAR(20) DEFAULT NULL,
    `unit_id` INT NOT NULL,
    `gst_rate_id` INT NOT NULL,
    `purchase_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `sale_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `reorder_level` DECIMAL(12, 2) NOT NULL DEFAULT 10.00,
    `stock_qty` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_prod_sku` (`sku`),
    INDEX `idx_prod_barcode` (`barcode`),
    INDEX `idx_prod_category` (`category_id`),
    CONSTRAINT `fk_prod_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
    CONSTRAINT `fk_prod_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`),
    CONSTRAINT `fk_prod_gst` FOREIGN KEY (`gst_rate_id`) REFERENCES `gst_rates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Customers Table
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `mobile` VARCHAR(20) DEFAULT NULL,
    `address` TEXT DEFAULT NULL,
    `gstin` VARCHAR(20) DEFAULT NULL,
    `opening_balance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `current_balance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_cust_mobile` (`mobile`),
    INDEX `idx_cust_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Suppliers Table
DROP TABLE IF EXISTS `suppliers`;
CREATE TABLE `suppliers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `mobile` VARCHAR(20) DEFAULT NULL,
    `address` TEXT DEFAULT NULL,
    `gstin` VARCHAR(20) DEFAULT NULL,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Purchases Table
DROP TABLE IF EXISTS `purchases`;
CREATE TABLE `purchases` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `purchase_no` VARCHAR(50) NOT NULL UNIQUE,
    `supplier_id` INT NOT NULL,
    `supplier_invoice_no` VARCHAR(100) DEFAULT NULL,
    `invoice_date` DATE NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `tax_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `grand_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    `notes` TEXT DEFAULT NULL,
    `created_by` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_purch_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
    CONSTRAINT `fk_purch_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Purchase Items Table
DROP TABLE IF EXISTS `purchase_items`;
CREATE TABLE `purchase_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `purchase_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `qty` DECIMAL(12, 2) NOT NULL,
    `unit_cost` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `taxable_value` DECIMAL(12, 2) NOT NULL,
    `tax_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `line_total` DECIMAL(12, 2) NOT NULL,
    CONSTRAINT `fk_pi_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pi_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Sales Table
DROP TABLE IF EXISTS `sales`;
CREATE TABLE `sales` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `invoice_no` VARCHAR(50) NOT NULL UNIQUE,
    `customer_id` INT DEFAULT NULL,
    `category_filter` VARCHAR(50) DEFAULT 'ALL',
    `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `discount_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `taxable_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `cgst_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `sgst_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `igst_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `round_off` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `grand_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `paid_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `due_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `payment_status` VARCHAR(20) NOT NULL DEFAULT 'PAID',
    `status` VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    `created_by` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_sale_invoice` (`invoice_no`),
    INDEX `idx_sale_customer` (`customer_id`),
    INDEX `idx_sale_date` (`created_at`),
    CONSTRAINT `fk_sales_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_sales_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Sale Items Table
DROP TABLE IF EXISTS `sale_items`;
CREATE TABLE `sale_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sale_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `product_name_snapshot` VARCHAR(150) NOT NULL,
    `sku_snapshot` VARCHAR(50) NOT NULL,
    `hsn_snapshot` VARCHAR(20) DEFAULT NULL,
    `unit_snapshot` VARCHAR(20) NOT NULL,
    `qty` DECIMAL(12, 2) NOT NULL,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `tax_rate_snapshot` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `taxable_value` DECIMAL(12, 2) NOT NULL,
    `tax_amount` DECIMAL(12, 2) NOT NULL,
    `line_total` DECIMAL(12, 2) NOT NULL,
    CONSTRAINT `fk_si_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_si_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Payments Table
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sale_id` INT DEFAULT NULL,
    `customer_id` INT DEFAULT NULL,
    `method` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `reference_no` VARCHAR(100) DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `received_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `received_by` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pay_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_pay_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_pay_user` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Sale Returns Table
DROP TABLE IF EXISTS `sale_returns`;
CREATE TABLE `sale_returns` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sale_id` INT NOT NULL,
    `return_no` VARCHAR(50) NOT NULL UNIQUE,
    `return_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `total_refund` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `reason` TEXT DEFAULT NULL,
    `created_by` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_sr_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`),
    CONSTRAINT `fk_sr_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Sale Return Items Table
DROP TABLE IF EXISTS `sale_return_items`;
CREATE TABLE `sale_return_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `return_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `qty` DECIMAL(12, 2) NOT NULL,
    `refund_amount` DECIMAL(12, 2) NOT NULL,
    `line_total` DECIMAL(12, 2) NOT NULL,
    CONSTRAINT `fk_sri_return` FOREIGN KEY (`return_id`) REFERENCES `sale_returns` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_sri_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Customer Ledger Table
DROP TABLE IF EXISTS `customer_ledger`;
CREATE TABLE `customer_ledger` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT NOT NULL,
    `sale_id` INT DEFAULT NULL,
    `payment_id` INT DEFAULT NULL,
    `entry_type` VARCHAR(30) NOT NULL,
    `debit` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `credit` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `balance_after` DECIMAL(12, 2) NOT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_ledger_cust` (`customer_id`),
    CONSTRAINT `fk_ledger_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
    CONSTRAINT `fk_ledger_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_ledger_pay` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. Collection Receipts Table
DROP TABLE IF EXISTS `collection_receipts`;
CREATE TABLE `collection_receipts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `receipt_no` VARCHAR(50) NOT NULL UNIQUE,
    `customer_id` INT NOT NULL,
    `payment_id` INT NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `payment_method` VARCHAR(20) NOT NULL,
    `reference_no` VARCHAR(100) DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_by` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_col_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
    CONSTRAINT `fk_col_pay` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`),
    CONSTRAINT `fk_col_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. Stock Movements Table
DROP TABLE IF EXISTS `stock_movements`;
CREATE TABLE `stock_movements` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `movement_type` VARCHAR(30) NOT NULL,
    `qty_in` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `qty_out` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `reference_type` VARCHAR(50) DEFAULT NULL,
    `reference_id` VARCHAR(100) DEFAULT NULL,
    `reason` VARCHAR(255) DEFAULT NULL,
    `created_by` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_sm_prod` (`product_id`),
    CONSTRAINT `fk_sm_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
    CONSTRAINT `fk_sm_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. Settings Table
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
    `setting_key` VARCHAR(100) NOT NULL PRIMARY KEY,
    `setting_value` TEXT DEFAULT NULL,
    `updated_by` INT DEFAULT NULL,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. Audit Logs Table
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT DEFAULT NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` VARCHAR(100) DEFAULT NULL,
    `metadata_json` JSON DEFAULT NULL,
    `ip_address` VARCHAR(45) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_audit_user` (`user_id`),
    INDEX `idx_audit_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. Backup Metadata Table
DROP TABLE IF EXISTS `backup_metadata`;
CREATE TABLE `backup_metadata` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `file_name` VARCHAR(255) NOT NULL,
    `file_size` BIGINT NOT NULL,
    `schema_version` VARCHAR(50) NOT NULL,
    `checksum` VARCHAR(64) NOT NULL,
    `created_by` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 28. Idempotency Keys Table
DROP TABLE IF EXISTS `idempotency_keys`;
CREATE TABLE `idempotency_keys` (
    `idempotency_key` VARCHAR(100) NOT NULL PRIMARY KEY,
    `request_path` VARCHAR(255) NOT NULL,
    `response_code` INT NOT NULL,
    `response_body` JSON NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- SEED INITIAL DATA (Roles, Permissions, Default Admin, Categories, Units, GST)
-- =============================================================================

-- Roles
INSERT IGNORE INTO `roles` (`id`, `role_name`, `description`) VALUES
(1, 'ADMIN', 'System Administrator with full access'),
(2, 'MANAGER', 'Store Manager with operational management rights'),
(3, 'CASHIER', 'Billing cashier for POS operations'),
(4, 'INVENTORY', 'Inventory officer for stock management'),
(5, 'ACCOUNTANT', 'Financial accountant for reports and ledgers'),
(6, 'VIEWER', 'Read-only viewer');

-- Permissions
INSERT IGNORE INTO `permissions` (`permission_key`, `module`, `action`, `description`) VALUES
('dashboard:read', 'dashboard', 'read', 'View store dashboard summaries'),
('billing:read', 'billing', 'read', 'View billing screens'),
('billing:quote', 'billing', 'quote', 'Generate invoice quotes'),
('billing:checkout', 'billing', 'checkout', 'Process sales checkout and payments'),
('billing:void', 'billing', 'void', 'Void or cancel invoices'),
('products:read', 'products', 'read', 'View product catalog'),
('products:create', 'products', 'create', 'Create new products'),
('products:update', 'products', 'update', 'Edit product details'),
('products:archive', 'products', 'archive', 'Archive/disable products'),
('customers:read', 'customers', 'read', 'View customer list'),
('customers:create', 'customers', 'create', 'Register new customers'),
('customers:update', 'customers', 'update', 'Edit customer profiles'),
('customers:credit', 'customers', 'credit', 'Manage customer credit accounts'),
('purchases:read', 'purchases', 'read', 'View purchase records'),
('purchases:create', 'purchases', 'create', 'Record supplier purchases'),
('stock:read', 'stock', 'read', 'View current stock levels'),
('stock:adjust', 'stock', 'adjust', 'Perform manual stock adjustments'),
('sales:read', 'sales', 'read', 'View sales invoices history'),
('sales:return', 'sales', 'return', 'Process sales returns'),
('payments:read', 'payments', 'read', 'View payments and receipts'),
('payments:collect', 'payments', 'collect', 'Collect credit instalments'),
('reports:read', 'reports', 'read', 'View analytical reports'),
('reports:export', 'reports', 'export', 'Export reports to CSV/PDF'),
('users:manage', 'users', 'manage', 'Manage user accounts'),
('roles:manage', 'roles', 'manage', 'Manage roles and permissions'),
('settings:read', 'settings', 'read', 'View shop settings'),
('settings:manage', 'settings', 'manage', 'Update shop settings'),
('backup:create', 'backup', 'create', 'Create database backups'),
('backup:restore', 'backup', 'restore', 'Restore database backups'),
('audit:read', 'audit', 'read', 'View audit logs');

-- Role Permissions
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) SELECT 1, `id` FROM `permissions`;

-- Default Administrator User (username: admin, password: AdminPass123!)
INSERT IGNORE INTO `users` (`id`, `name`, `username`, `email`, `password_hash`, `role_id`, `is_active`) VALUES
(1, 'System Administrator', 'admin', 'admin@paintshop.com', '$2b$10$o.Y/un3kal2RWRKeESc5/OXwxCkPtlX5yGkKhLC8J07WRt27eV4h6', 1, 1);

-- Default Categories
INSERT IGNORE INTO `categories` (`id`, `name`, `description`, `active`) VALUES
(1, 'Paint', 'Decorative and industrial paint products, primers, putties', 1),
(2, 'Bags', 'Packaged cement and chemical bags', 1),
(3, 'Sunnam Bags', 'Lime, whitewash, and sunnam powder bags', 1),
(4, 'Tools & Accessories', 'Brushes, rollers, sandpapers, tape, spray equipment', 1);

-- Default Units
INSERT IGNORE INTO `units` (`id`, `code`, `name`, `base_unit_id`, `conversion_factor`) VALUES
(1, 'LTR', 'Litre', NULL, 1.0000),
(2, 'KG', 'Kilogram', NULL, 1.0000),
(3, 'BAG', 'Bag', NULL, 1.0000),
(4, 'PCS', 'Piece', NULL, 1.0000),
(5, 'BOX', 'Box', NULL, 1.0000),
(6, 'MTR', 'Meter', NULL, 1.0000);

-- Default GST Rates
INSERT IGNORE INTO `gst_rates` (`id`, `rate`, `name`, `description`, `active`) VALUES
(1, 0.00, '0% Exempt', 'Exempt items (0% GST)', 1),
(2, 5.00, '5% GST', 'Reduced tax rate (5% GST)', 1),
(3, 12.00, '12% GST', 'Standard lower rate (12% GST)', 1),
(4, 18.00, '18% GST', 'Standard rate for paints and chemicals (18% GST)', 1),
(5, 28.00, '28% GST', 'Higher luxury/special rate (28% GST)', 1);

-- Default Settings
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES
('shop_name', 'Skill Tech Paint & Sunnam Shop'),
('gstin', '36AAAAA0000A1Z5'),
('address', '123 Main Road, Paint Market, Hyderabad, Telangana'),
('phone', '+91 9876543210'),
('email', 'contact@paintshop.com'),
('invoice_prefix', 'INV-'),
('invoice_next_number', '1001'),
('receipt_prefix', 'REC-'),
('receipt_next_number', '1001'),
('purchase_prefix', 'PUR-'),
('purchase_next_number', '1001'),
('return_prefix', 'RET-'),
('return_next_number', '1001'),
('tax_mode', 'INTRA_STATE'),
('low_stock_threshold', '10');

SET FOREIGN_KEY_CHECKS = 1;
