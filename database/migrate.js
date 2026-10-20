require('dotenv').config();

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function calculateChecksum(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function runMigrations() {
    let connection;

    try {
        const host = process.env.DB_HOST || '127.0.0.1';
        const port = Number(process.env.DB_PORT || 3306);
        const user = process.env.DB_USER || 'root';
        const password = process.env.DB_PASSWORD ?? '';
        const databaseName = process.env.DB_NAME || 'paint_shop_dev';

        if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
            throw new Error('Invalid database name configured in DB_NAME');
        }

        connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
            multipleStatements: true
        });

        await connection.query(
            `CREATE DATABASE IF NOT EXISTS \`${databaseName}\`
             CHARACTER SET utf8mb4
             COLLATE utf8mb4_unicode_ci`
        );

        await connection.query(`USE \`${databaseName}\``);
        console.log(`Connected to database "${databaseName}".`);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`schema_migrations\` (
                \`version\` VARCHAR(255) NOT NULL PRIMARY KEY,
                \`applied_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`checksum\` VARCHAR(64) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        const [appliedRows] = await connection.query(
            'SELECT `version`, `checksum` FROM `schema_migrations` ORDER BY `version` ASC'
        );

        const appliedMap = new Map();
        for (const row of appliedRows) {
            appliedMap.set(row.version, row.checksum);
        }

        const migrationsDir = path.join(__dirname, 'migrations');
        if (!fs.existsSync(migrationsDir)) {
            console.log('No migrations directory found.');
            return;
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        console.log(`Found ${files.length} migration file(s).`);

        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8').trim();
            if (!sql) continue;

            const fileChecksum = calculateChecksum(sql);

            if (appliedMap.has(file)) {
                const appliedChecksum = appliedMap.get(file);
                if (appliedChecksum !== fileChecksum) {
                    console.warn(`[WARN] Migration ${file} checksum mismatch! Local: ${fileChecksum}, Applied: ${appliedChecksum}`);
                } else {
                    console.log(`Migration ${file} is already applied.`);
                }
                continue;
            }

            console.log(`Applying migration: ${file}...`);
            await connection.query(sql);

            await connection.query(
                'INSERT INTO `schema_migrations` (`version`, `checksum`) VALUES (?, ?)',
                [file, fileChecksum]
            );

            console.log(`Migration ${file} applied successfully.`);
        }

        console.log('All database migrations completed successfully.');
    } catch (error) {
        console.error('Migration execution failed:', error.message);
        process.exitCode = 1;
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

if (require.main === module) {
    runMigrations().catch(() => process.exit(1));
}

module.exports = { runMigrations };
