-- 002_seed_initial_data.sql
-- Initial roles, permissions, default users, default categories, units, GST rates, and shop settings

-- 1. Insert Roles
INSERT IGNORE INTO `roles` (`id`, `role_name`, `description`) VALUES
(1, 'ADMIN', 'System Administrator with full access'),
(2, 'MANAGER', 'Store Manager with operational management rights'),
(3, 'CASHIER', 'Billing cashier for POS operations'),
(4, 'INVENTORY', 'Inventory officer for stock management'),
(5, 'ACCOUNTANT', 'Financial accountant for reports and ledgers'),
(6, 'VIEWER', 'Read-only viewer');

-- 2. Insert Permissions
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

-- 3. Assign All Permissions to ADMIN Role (Role ID 1)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 1, `id` FROM `permissions`;

-- 4. Assign Permissions to MANAGER (Role ID 2)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 2, `id` FROM `permissions` WHERE `permission_key` NOT IN ('backup:restore', 'users:manage');

-- 5. Assign Permissions to CASHIER (Role ID 3)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 3, `id` FROM `permissions` WHERE `permission_key` IN (
    'dashboard:read', 'billing:read', 'billing:quote', 'billing:checkout',
    'products:read', 'customers:read', 'customers:create', 'sales:read', 'payments:collect'
);

-- 6. Assign Permissions to INVENTORY (Role ID 4)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 4, `id` FROM `permissions` WHERE `permission_key` IN (
    'dashboard:read', 'products:read', 'products:create', 'products:update',
    'stock:read', 'stock:adjust', 'purchases:read', 'purchases:create'
);

-- 7. Assign Permissions to ACCOUNTANT (Role ID 5)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 5, `id` FROM `permissions` WHERE `permission_key` IN (
    'dashboard:read', 'sales:read', 'purchases:read', 'customers:read',
    'payments:read', 'payments:collect', 'reports:read', 'reports:export'
);

-- 8. Assign Permissions to VIEWER (Role ID 6)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 6, `id` FROM `permissions` WHERE `action` = 'read';

-- 9. Default Administrator Account (username: admin, password: AdminPass123!)
INSERT IGNORE INTO `users` (`id`, `name`, `username`, `email`, `password_hash`, `role_id`, `is_active`) VALUES
(1, 'System Administrator', 'admin', 'admin@paintshop.com', '$2b$10$o.Y/un3kal2RWRKeESc5/OXwxCkPtlX5yGkKhLC8J07WRt27eV4h6', 1, 1);

-- 10. Insert Default Categories
INSERT IGNORE INTO `categories` (`id`, `name`, `description`, `active`) VALUES
(1, 'Paint', 'Decorative and industrial paint products, primers, putties', 1),
(2, 'Bags', 'Packaged cement and chemical bags', 1),
(3, 'Sunnam Bags', 'Lime, whitewash, and sunnam powder bags', 1),
(4, 'Tools & Accessories', 'Brushes, rollers, sandpapers, tape, spray equipment', 1);

-- 11. Insert Default Units
INSERT IGNORE INTO `units` (`id`, `code`, `name`, `base_unit_id`, `conversion_factor`) VALUES
(1, 'LTR', 'Litre', NULL, 1.0000),
(2, 'KG', 'Kilogram', NULL, 1.0000),
(3, 'BAG', 'Bag', NULL, 1.0000),
(4, 'PCS', 'Piece', NULL, 1.0000),
(5, 'BOX', 'Box', NULL, 1.0000),
(6, 'MTR', 'Meter', NULL, 1.0000);

-- 12. Insert Default GST Rates
INSERT IGNORE INTO `gst_rates` (`id`, `rate`, `name`, `description`, `active`) VALUES
(1, 0.00, '0% Exempt', 'Exempt items (0% GST)', 1),
(2, 5.00, '5% GST', 'Reduced tax rate (5% GST)', 1),
(3, 12.00, '12% GST', 'Standard lower rate (12% GST)', 1),
(4, 18.00, '18% GST', 'Standard rate for paints and chemicals (18% GST)', 1),
(5, 28.00, '28% GST', 'Higher luxury/special rate (28% GST)', 1);

-- 13. Insert Default Settings
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
