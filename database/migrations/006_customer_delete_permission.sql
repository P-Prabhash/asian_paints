INSERT IGNORE INTO `permissions` (`permission_key`, `module`, `action`, `description`)
VALUES ('customers:delete', 'customers', 'delete', 'Archive customer profiles while retaining transaction history');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id`
FROM `roles` r
JOIN `permissions` p ON p.`permission_key` = 'customers:delete'
WHERE r.`role_name` IN ('ADMIN', 'MANAGER');
