INSERT IGNORE INTO `permissions` (`permission_key`, `module`, `action`, `description`)
VALUES
    ('purchases:update', 'purchases', 'update', 'Edit purchase records and reconcile stock'),
    ('purchases:delete', 'purchases', 'delete', 'Void purchases and reverse stock'),
    ('sales:delete', 'sales', 'delete', 'Void sales and restore stock while retaining history');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id`
FROM `roles` r
JOIN `permissions` p ON p.`permission_key` IN ('purchases:update', 'purchases:delete')
WHERE r.`role_name` IN ('ADMIN', 'MANAGER', 'INVENTORY');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id`
FROM `roles` r
JOIN `permissions` p ON p.`permission_key` = 'sales:delete'
WHERE r.`role_name` IN ('ADMIN', 'MANAGER');
