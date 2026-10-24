ALTER TABLE `suppliers`
    ADD COLUMN `supplier_code` VARCHAR(50) DEFAULT NULL AFTER `id`,
    ADD UNIQUE INDEX `uq_suppliers_supplier_code` (`supplier_code`);
