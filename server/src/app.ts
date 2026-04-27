import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { connectDB } from "./config/db";
import { mergedOpenApiDocument } from "./docs/mergedOpenapi";

dotenv.config();

const app: Application = express();

connectDB();

// Middleware
app.use(express.json()); // Body parser

app.use(helmet()); // Security headers

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
); // Enable CORS for frontend with cookies/credentials support

app.use(compression()); // Compress responses

// Logging
const logPath: string = path.join(process.cwd(), "logs", "access.log"); // create log file path

fs.mkdirSync(path.dirname(logPath), { recursive: true }); // make sure folder exists (important)

const accessLogStream: fs.WriteStream = fs.createWriteStream(logPath, {
  flags: "a",
}); // create write stream

morgan.token("body", (req: Request) => {
  return JSON.stringify(req.body);
});

morgan.token("headers", (req: Request) => {
  return JSON.stringify(req.headers);
});

app.use(
  morgan(
    ":method :url :status :response-time ms\nbody: :body\nheaders: :headers",
    { stream: accessLogStream },
  ),
);

// Basic Health Check Route
app.post("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "UP", message: "Server is running smoothly" });
});

// Import routes
import authRoutes from "./routes/authRoutes";
import postRoutes from "./routes/postRoutes";
// Routes
app.use("/auth", authRoutes);
app.use("/posts", postRoutes);

// OpenAPI JSON for tooling (frontend type generation, SDKs, CI validation)
app.get("/openapi.json", (_req: Request, res: Response) => {
  res.status(200).json(mergedOpenApiDocument);
});

// Swagger UI for interactive docs
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(mergedOpenApiDocument, {
    explorer: true,
    customSiteTitle: "StudyFAST API Docs",
  }),
);

export default app;
