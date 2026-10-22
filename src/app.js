const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const yaml = require("yaml");
const fs = require("fs");
const path = require("path");

const env = require("./config/env");
const routes = require("./routes/index.routes");
const httpLogger = require("./middleware/http-logger");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");
const { apiLimiter } = require("./middleware/rate-limit");

const app = express();

app.disable("x-powered-by");

// Security Headers & CORS
app.use(helmet({
    contentSecurityPolicy: false // Allow Swagger UI inline scripts & CSS
}));

app.use(cors({
    origin: env.corsOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID", "Idempotency-Key"]
}));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "2mb" }));

// Terminal Request/Response Logging Middleware (Mandatory Requirement #10)
app.use(httpLogger);

// Swagger API Documentation UI (available at /api-docs)
if (env.swaggerEnabled) {
    const openapiPath = path.join(__dirname, "..", "docs", "openapi.yaml");
    try {
        const swaggerDocument = yaml.parse(fs.readFileSync(openapiPath, "utf8"));

        const serveSwaggerDocument = (req, res) => {
            res.json(swaggerDocument);
        };
        app.get(["/api-docs/swagger.json", "/docs/swagger.json"], serveSwaggerDocument);

        const swaggerUiHandler = swaggerUi.setup(swaggerDocument, {
            swaggerOptions: {
                url: "/api-docs/swagger.json"
            }
        });
        app.use(["/api-docs", "/docs"], swaggerUi.serve, swaggerUiHandler);

        console.log("Swagger UI successfully configured at http://localhost:" + env.port + "/docs");
    } catch (err) {
        console.warn("Swagger UI failed to load openapi.yaml:", err.message);
    }
}

// Global API Rate Limiting
app.use(env.apiPrefix, apiLimiter);

// API v1 Routes (/api/v1)
app.use(env.apiPrefix, routes);

// 404 & Centralized Error Handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
