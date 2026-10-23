# Paint Shop & Sunnam Bags ERP - Complete Backend API

Enterprise Grade Node.js & Express POS/ERP Backend API for Paint, Primer, Putty, Bags, and Sunnam Whitewash Retail/Wholesale Management.

---

## 1. MANDATORY TECHNOLOGIES & ARCHITECTURE

- **Backend Runtime**: Node.js & Express.js (Modular MVC-Repository Architecture)
- **Database Engine**: MySQL Server (Managed via MySQL Workbench)
- **Database Driver**: `mysql2/promise` with connection pooling & transaction handling
- **Authentication**: JWT (`jsonwebtoken`) & password hashing (`bcrypt`)
- **Validation**: Zod request schema validation
- **API Specs & Docs**: Swagger UI and OpenAPI 3.0 (`/api-docs`)
- **Automated Testing**: Jest & Supertest
- **Configuration**: `dotenv` environment variable management

---

## 2. WINDOWS & MYSQL WORKBENCH SETUP INSTRUCTIONS

### Step 1: Install and Start MySQL Server
1. Download and install **MySQL Community Server** (v8.0+) or MySQL Installer for Windows.
2. Ensure MySQL Server service is running on host `127.0.0.1` and port `3306`.

### Step 2: Open MySQL Workbench and Setup Connection
1. Launch **MySQL Workbench**.
2. Click **+** next to MySQL Connections to add a new connection:
   - **Connection Name**: `Paint Shop Dev`
   - **Hostname**: `127.0.0.1`
   - **Port**: `3306`
   - **Username**: `root`
3. Click **Test Connection** and enter your MySQL root password. Click **OK**.

### Step 3: Initialize Database and Application User
1. Open the connection in MySQL Workbench.
2. File -> Open SQL Script -> Select `database/setup_mysql_workbench.sql`.
3. Execute the script (Lightning icon) to create database `paint_shop_dev` and user `paint_shop_app`.

### Step 4: Configure Environment File
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Update `.env` with your local database credentials:
   ```ini
   NODE_ENV=development
   PORT=5000
   API_PREFIX=/api/v1
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=paint_shop_dev
   DB_USER=root
   DB_PASSWORD=your_mysql_root_password
   JWT_SECRET=replace_with_a_long_random_secret_at_least_32_chars_long
   LOG_LEVEL=debug
   LOG_HTTP_BODIES=true
   SWAGGER_ENABLED=true
   ```

---

## 3. DATABASE MIGRATIONS & INITIAL SEEDING

Run automated migrations to construct all 27 database tables and seed default roles, permissions, categories, units, and GST rates:

```bash
# Run database migrations
npm run migrate

# Seed sample products, suppliers, and customers
npm run seed
```

---

## 4. CREATING THE FIRST ADMINISTRATOR

Before logging in, initialize the primary administrator account (can be run only once when no admin exists):

```bash
curl -X POST http://localhost:5000/api/v1/auth/first-run-admin \
  -H "Content-Type: application/json" \
  -d '{"name":"System Admin","username":"admin","email":"admin@paintshop.com","password":"AdminPassword123!"}'
```

---

## 5. STARTING THE BACKEND API

```bash
# Start production server
npm start

# Start development server with auto-reload (nodemon)
npm run dev
```

The API will run on `http://localhost:5000`.

Open Swagger API Documentation in your browser:
**`http://localhost:5000/api-docs`**

---

## 6. RUNNING AUTOMATED TESTS

Execute the comprehensive automated test suite (Jest + Supertest):

```bash
# Run all unit and integration tests
npm test
```

---

## 7. DATABASE BACKUP AND RESTORE

### Creating a Backup (Admin Only)
```bash
POST /api/v1/backups
Header: Authorization: Bearer <ADMIN_JWT_TOKEN>
```
Creates a timestamped SQL dump in `backups/` with SHA256 checksum verification.

### Restoring a Backup (Admin Only)
```bash
POST /api/v1/backups/:id/restore
Header: Authorization: Bearer <ADMIN_JWT_TOKEN>
```
Verifies file checksum integrity and restores database state safely.

---

## 8. API ENDPOINT CATALOG

| Category | Method & Endpoint | Description | Permission |
| :--- | :--- | :--- | :--- |
| **Health** | `GET /api/v1/health/live` | Liveness check | Public |
| **Health** | `GET /api/v1/health/ready` | DB Readiness check | Public |
| **Auth** | `POST /api/v1/auth/first-run-admin` | First-time admin creation | Public (Once) |
| **Auth** | `POST /api/v1/auth/login` | User login & JWT issuance | Public |
| **Auth** | `POST /api/v1/auth/logout` | Token revocation | Authenticated |
| **Auth** | `GET /api/v1/auth/me` | Profile & permissions | Authenticated |
| **Users** | `GET /api/v1/users` | List user accounts | `users:manage` |
| **Users** | `POST /api/v1/users` | Create user account | `users:manage` |
| **Roles** | `GET /api/v1/roles` | List system roles | `roles:manage` |
| **Roles** | `PUT /api/v1/roles/:id/permissions` | Update role permissions | `roles:manage` |
| **POS** | `GET /api/v1/products/lookup?code=X` | Barcode/SKU scan lookup | `products:read` |
| **POS** | `GET /api/v1/billing/products` | Paginated active catalog with GST-inclusive prices; filter with `categoryFilter=PAINT` or `SUNNAM` | `billing:read` |
| **Products** | `GET /api/v1/products` | List products | `products:read` |
| **Products** | `POST /api/v1/products` | Create product | `products:create` |
| **Categories** | `GET /api/v1/categories` | List categories | `products:read` |
| **Units** | `GET /api/v1/units` | List units | `products:read` |
| **GST** | `GET /api/v1/gst-rates` | List GST tax rates | `products:read` |
| **Billing** | `POST /api/v1/billing/quote` | Calculate GST-inclusive quote and tax breakdown (preview) | `billing:quote` |
| **Billing** | `POST /api/v1/billing/checkout` | POS checkout, category-specific invoice, stock deduction, and payment recording | `billing:checkout` |
| **Sales** | `GET /api/v1/sales` | List/filter Paint and Sunnam invoices | `sales:read` |
| **Sales** | `GET /api/v1/sales/:id` | Get invoice line items, GST, and payments | `sales:read` |
| **Sales** | `GET /api/v1/sales/:id/receipt` | Print-ready 80mm thermal invoice HTML | `sales:read` |
| **Sales** | `POST /api/v1/sales/:id/returns` | Process sales return & restock | `sales:return` |
| **Customers** | `GET /api/v1/customers` | List customer accounts | `customers:read` |
| **Customers** | `GET /api/v1/customers/:id/ledger` | View customer credit ledger | `customers:read` |
| **Customers** | `POST /api/v1/customers/:id/collections` | Collect credit instalment | `payments:collect` |
| **Purchases** | `POST /api/v1/purchases` | Receive supplier stock purchase | `purchases:create` |
| **Stock** | `GET /api/v1/stock` | View stock levels | `stock:read` |
| **Stock** | `POST /api/v1/stock/adjustments` | Manual stock adjustment | `stock:adjust` |
| **Reports** | `GET /api/v1/reports/dashboard` | KPI summaries & trends | `dashboard:read` |
| **Settings** | `GET/PATCH /api/v1/settings` | Shop configuration | `settings:read` / `manage` |
| **Backups** | `POST /api/v1/backups` | Create database backup | `backup:create` |
| **Audit** | `GET /api/v1/audit-logs` | View audit trail | `audit:read` |

---

## 9. GENERATING CLEAN BACKEND ZIP ARTIFACT

To create a clean release ZIP excluding `node_modules`, `.env`, `.git`, and backups:

```bash
npm run package:zip
```

Output generated at: `Paint_Shop_Backend_Complete.zip`.
