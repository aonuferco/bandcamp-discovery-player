import express from "express";
import cors from "cors";
import albumsRouter from "../src/server/routes/albums.js";
import { staticMiddleware } from "../src/server/middleware/static.js";

const app = express();

// Middleware
app.use(cors());
app.use(staticMiddleware(express));

// Debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api", albumsRouter);
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Export the Express app for Vercel
export default app;
