import express, { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import cors from "cors";
import albumsRouter from "../src/server/routes/albums.js";
import { staticMiddleware } from "../src/server/middleware/static.js";
import type { HealthCheckResponse, ApiErrorResponse } from "../src/server/types.js";

const app = express();

// Middleware
app.use(cors());
app.use(staticMiddleware(express));

// Debugging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api", albumsRouter);
app.get("/health", (req: Request, res: Response<HealthCheckResponse>) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/favicon.ico", (req: Request, res: Response) => {
  res.status(204).end();
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err, req, res: Response<ApiErrorResponse>, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    details:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
};
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response<ApiErrorResponse>) => {
  res.status(404).json({ error: "Not found" });
});

// Export the Express app for Vercel
export default app;
