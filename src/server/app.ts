import express, {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";
import cors from "cors";
import albumsRouter from "./routes/albums.js";
import { staticMiddleware } from "./middleware/static.js";
import type { HealthCheckResponse, ApiErrorResponse } from "./types.js";

const app = express();
const PORT: number = parseInt(process.env['PORT'] || "3000", 10);

// Middleware
app.use(cors());
app.use(staticMiddleware(express));

// Debugging/Logging middleware
app.use((req: Request, res: Response, next: NextFunction): void => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api", albumsRouter);

app.get("/health", (req: Request, res: Response<HealthCheckResponse>): void => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/favicon.ico", (req: Request, res: Response): void => {
  res.status(204).end();
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response<ApiErrorResponse>,
  _next: NextFunction
): void => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    details:
      process.env['NODE_ENV'] === "development"
        ? err.message
        : "Something went wrong",
  });
};
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response<ApiErrorResponse>): void => {
  res.status(404).json({ error: "Not found" });
});

export { app, PORT };
