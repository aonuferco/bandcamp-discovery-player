import express from "express";
import cors from "cors";
import path from "path";
import albumsRouter from "./routes/albums.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());

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

// Serve index.html for root path
app.get("/", (req, res) => {
  try {
    const indexPath = path.resolve(process.cwd(), "public/index.html");
    console.log("Attempting to serve index.html from:", indexPath);
    res.sendFile(indexPath);
  } catch (error) {
    console.error("Error serving index.html:", error);
    res.status(500).json({ error: "Could not serve index.html" });
  }
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

export { app, PORT };
