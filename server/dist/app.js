"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const db_1 = require("./config/db");
const mergedOpenapi_1 = require("./docs/mergedOpenapi");
const requestContext_1 = require("./middleware/requestContext");
const errorHandler_1 = require("./middleware/errorHandler");
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
(0, db_1.connectDB)();
// Middleware
app.use(express_1.default.json()); // Body parser
app.use(requestContext_1.requestContextMiddleware); // Request context with requestId
app.use((0, helmet_1.default)()); // Security headers
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "http://127.0.0.1:5173"];
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
})); // Enable CORS for frontend with cookies/credentials support
app.use((0, compression_1.default)()); // Compress responses
// Logging - Use stdout (Railway captures automatically)
morgan_1.default.token("body", (req) => {
    return JSON.stringify(req.body);
});
morgan_1.default.token("headers", (req) => {
    return JSON.stringify(req.headers);
});
app.use((0, morgan_1.default)(":method :url :status :response-time ms\nbody: :body\nheaders: :headers"));
// Basic Health Check Route
app.post("/health", (req, res) => {
    res.status(200).json({ status: "UP", message: "Server is running smoothly" });
});
// Import routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const postRoutes_1 = __importDefault(require("./routes/postRoutes"));
// Routes
app.use("/auth", authRoutes_1.default);
app.use("/posts", postRoutes_1.default);
app.use("/ai", aiRoutes_1.default);
// OpenAPI JSON for tooling (frontend type generation, SDKs, CI validation)
app.get("/openapi.json", (_req, res) => {
    res.status(200).json(mergedOpenapi_1.mergedOpenApiDocument);
});
// Swagger UI for interactive docs
app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(mergedOpenapi_1.mergedOpenApiDocument, {
    explorer: true,
    customSiteTitle: "StudyFAST API Docs",
}));
// Error handler (must be last)
app.use(errorHandler_1.errorHandler);
exports.default = app;
