import express, {
  Request,
  Response,
  NextFunction,
} from "express";
import albumsRouter from "./routes/albums.js";
import { staticMiddleware } from "./middleware/static.js";
import type { HealthCheckResponse, ApiErrorResponse } from "./types.js";
import { PORT } from "./config.js";
import {
  corsMiddleware,
  securityHeadersMiddleware,
  rateLimitMiddleware,
} from "./middleware/security.js";

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(securityHeadersMiddleware);
app.use("/api", rateLimitMiddleware);
app.use(staticMiddleware(express));

// Debugging/Logging middleware
app.use((req: Request, res: Response, next: NextFunction): void => {
  // eslint-disable-next-line no-console
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

import { errorHandler } from "./middleware/error-handler.js";

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response<ApiErrorResponse>): void => {
  res.status(404).json({ error: "Not found" });
});

export { app, PORT };
