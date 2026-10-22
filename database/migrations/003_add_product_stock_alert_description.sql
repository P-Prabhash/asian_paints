ALTER TABLE `products`
ADD COLUMN `stock_alert_description` VARCHAR(255) DEFAULT NULL
AFTER `reorder_level`;
