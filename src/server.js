
const app = require("./app");
const env = require("./config/env");
const {
    checkDatabaseConnection,
    pool
} = require("./config/database");

let server;

async function startServer() {
    try {
        await checkDatabaseConnection();
        console.log("MySQL database connected.");

        server = app.listen(env.port, () => {
            console.log(`Paint Shop API running on http://localhost:${env.port}`);
            console.log(`Health: http://localhost:${env.port}${env.apiPrefix}/health`);
            console.log(`Readiness: http://localhost:${env.port}${env.apiPrefix}/health/ready`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        await pool.end().catch(() => {});
        process.exitCode = 1;
    }
}

async function shutdown(signal) {
    console.log(`${signal} received. Shutting down...`);

    if (server) {
        server.close(async () => {
            await pool.end();
            process.exit(0);
        });
    } else {
        await pool.end().catch(() => {});
        process.exit(0);
    }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

startServer();
