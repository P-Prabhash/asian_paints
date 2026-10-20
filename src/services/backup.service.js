const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pool } = require("../config/database");
const env = require("../config/env");
const AppError = require("../utils/app-error");
const BackupRepository = require("../repositories/backup.repository");
const AuditRepository = require("../repositories/audit.repository");

class BackupService {
    static getBackupDir() {
        const backupDir = path.join(__dirname, "..", "..", "backups");
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        return backupDir;
    }

    static async createBackup(actorId) {
        const backupDir = this.getBackupDir();
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fileName = `backup_${env.dbName}_${timestamp}.sql`;
        const filePath = path.join(backupDir, fileName);

        const tables = [
            "schema_migrations", "roles", "permissions", "role_permissions",
            "users", "user_permissions", "revoked_tokens", "categories", "units",
            "gst_rates", "products", "customers", "suppliers", "purchases",
            "purchase_items", "sales", "sale_items", "payments", "sale_returns",
            "sale_return_items", "customer_ledger", "collection_receipts",
            "stock_movements", "settings", "audit_logs", "backup_metadata", "idempotency_keys"
        ];

        let sqlDump = `-- Paint Shop Database Backup\n-- Database: ${env.dbName}\n-- Created At: ${new Date().toISOString()}\n\n`;

        for (const table of tables) {
            try {
                const [createRows] = await pool.query(`SHOW CREATE TABLE \`${table}\``);
                if (createRows.length > 0) {
                    sqlDump += `DROP TABLE IF EXISTS \`${table}\`;\n`;
                    sqlDump += `${createRows[0]["Create Table"]};\n\n`;

                    const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
                    if (rows.length > 0) {
                        for (const row of rows) {
                            const keys = Object.keys(row).map(k => `\`${k}\``).join(", ");
                            const values = Object.values(row).map(v => {
                                if (v === null) return "NULL";
                                if (typeof v === "number") return v;
                                if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
                                if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
                                return `'${String(v).replace(/'/g, "''")}'`;
                            }).join(", ");
                            sqlDump += `INSERT INTO \`${table}\` (${keys}) VALUES (${values});\n`;
                        }
                        sqlDump += "\n";
                    }
                }
            } catch (_) {
            }
        }

        fs.writeFileSync(filePath, sqlDump, "utf8");

        const stats = fs.statSync(filePath);
        const checksum = crypto.createHash("sha256").update(sqlDump).digest("hex");

        const metadataId = await BackupRepository.createMetadata({
            fileName,
            fileSize: stats.size,
            schemaVersion: "1.0.0",
            checksum,
            createdBy: actorId
        });

        await AuditRepository.createLog({
            userId: actorId,
            action: "DATABASE_BACKUP_CREATED",
            entityType: "BACKUP",
            entityId: metadataId,
            metadata: { fileName, fileSize: stats.size }
        });

        return {
            id: metadataId,
            fileName,
            fileSize: stats.size,
            checksum,
            createdAt: new Date()
        };
    }

    static async listBackups() {
        return BackupRepository.listMetadata();
    }

    static async restoreBackup(id, actorId) {
        const metadata = await BackupRepository.findById(id);
        if (!metadata) throw new AppError("Backup record not found", 404, "BACKUP_NOT_FOUND");

        const backupDir = this.getBackupDir();
        const filePath = path.join(backupDir, metadata.file_name);

        if (!fs.existsSync(filePath)) {
            throw new AppError("Backup SQL file missing on server storage", 404, "BACKUP_FILE_MISSING");
        }

        const sqlDump = fs.readFileSync(filePath, "utf8");
        const checksum = crypto.createHash("sha256").update(sqlDump).digest("hex");

        if (checksum !== metadata.checksum) {
            throw new AppError("Backup file checksum mismatch! File may be corrupted or tampered.", 400, "CHECKSUM_MISMATCH");
        }

        const statements = sqlDump.split(";").map(s => s.trim()).filter(s => s.length > 0);

        const connection = await pool.getConnection();
        try {
            await connection.query("SET FOREIGN_KEY_CHECKS = 0;");
            for (const stmt of statements) {
                if (!stmt.startsWith("--")) {
                    await connection.query(stmt);
                }
            }
            await connection.query("SET FOREIGN_KEY_CHECKS = 1;");
        } finally {
            connection.release();
        }

        await AuditRepository.createLog({
            userId: actorId,
            action: "DATABASE_BACKUP_RESTORED",
            entityType: "BACKUP",
            entityId: id,
            metadata: { fileName: metadata.file_name }
        });

        return {
            restored: true,
            fileName: metadata.file_name,
            timestamp: new Date()
        };
    }
}

module.exports = BackupService;
