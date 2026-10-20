# Changelog - Paint Shop Desktop & Online ERP Backend Rebuild

## [1.0.0] - 2026-10-20

### Rebuild Summary
Rebuilt the entire backend from an incomplete skeleton into a production-grade, transaction-safe Node.js/Express & MySQL ERP backend according to the Paint Shop Business Management Software Blueprint.

### Fixed & Added Features
1. **Normalized Relational Database Design**:
   - Designed 27 normalized SQL tables with InnoDB engine, utf8mb4 collation, primary keys, foreign keys, indexes, decimal currency precision, and unique constraints.
   - Added tables for `users`, `roles`, `permissions`, `role_permissions`, `user_permissions`, `categories`, `units`, `gst_rates`, `products`, `customers`, `suppliers`, `purchases`, `purchase_items`, `sales`, `sale_items`, `payments`, `sale_returns`, `sale_return_items`, `customer_ledger`, `collection_receipts`, `stock_movements`, `settings`, `audit_logs`, `backup_metadata`, `revoked_tokens`, `idempotency_keys`, `schema_migrations`.

2. **Automated Database Setup & Migration Engine**:
   - Implemented `database/migrate.js` with versioned migration runner, SHA256 file checksum verification, and `schema_migrations` tracking.
   - Created `database/migrations/001_initial_schema.sql` and `database/migrations/002_seed_initial_data.sql`.
   - Created `database/setup_mysql_workbench.sql` for MySQL Workbench connection setup and application user privileges.
   - Created `database/seed.js` for development seed data.

3. **Authentication & Role-Based Access Control (RBAC)**:
   - Implemented `/api/v1/auth/first-run-admin` for single-execution first administrator setup.
   - Implemented `/api/v1/auth/login` with bcrypt password verification, active account checking, and JWT access token issuance.
   - Implemented `/api/v1/auth/logout` with server-side token revocation (`revoked_tokens` table).
   - Implemented `/api/v1/auth/me` profile and effective permission resolution.
   - Implemented granular server-side permission enforcement middleware (`authorize`) for all 30 system permissions across 6 roles (`ADMIN`, `MANAGER`, `CASHIER`, `INVENTORY`, `ACCOUNTANT`, `VIEWER`).

4. **Terminal Request & Response Logging Middleware**:
   - Implemented `src/middleware/http-logger.js` displaying formatted request/response details in the terminal.
   - Added unique `x-request-id` header generation and tracking.
   - Implemented recursive redaction of sensitive parameters (`password`, `token`, `secret`, `dbPassword`, etc.).

5. **Authoritative POS Billing & GST Calculation Engine**:
   - Created `POST /api/v1/billing/quote` calculation endpoint.
   - Created `POST /api/v1/billing/checkout` wrapped inside a single atomic MySQL transaction (`withTransaction`) with row locks (`FOR UPDATE`).
   - Re-fetches prices, tax rates, and stock directly from MySQL.
   - Idempotency protection via `idempotency_keys` table.
   - Strict requirement enforcement for Credit sales (Customer Name, Mobile, Address mandatory).
   - Atomic update of customer due balance and ledger entries.

6. **Purchases, Stock, and Credit Collections**:
   - Implemented `/api/v1/purchases` receiving purchases, incrementing stock (`qty_in`), recording stock movements.
   - Implemented `/api/v1/customers/:id/collections` for credit instalment receipts, updating balances, generating receipts (`REC-1001`), and writing audit logs.
   - Implemented `/api/v1/stock/adjustments` with manual stock adjustment logging and user tracking.
   - Implemented `/api/v1/sales/:id/returns` with stock reversal (`qty_in`) and financial credit ledger adjustment.

7. **Reports, Settings & Administrator Backups**:
   - Implemented `/api/v1/reports/dashboard`, `/sales`, `/products`, `/gst`, `/receivables`.
   - Implemented `/api/v1/settings` read & update.
   - Implemented `/api/v1/backups` SQL dump creation, checksum generation, and `/restore`.

8. **Swagger UI & OpenAPI Specifications**:
   - Documented all endpoints in `docs/openapi.yaml` and served at `/api-docs`.
   - Created `docs/frontend-api-client.js` Vanilla JS fetch helper.

9. **Automated Testing Suite**:
   - Built 4 Jest test suites (`tests/unit/money.test.js`, `tests/unit/logger.test.js`, `tests/integration/routes.test.js`, `tests/integration/api.test.js`).
   - Verified 100% test pass rate.
