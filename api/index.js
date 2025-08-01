import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { app } from "../src/server/app.js";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a new app instance for Vercel
const vercelApp = express();

// Serve static files from the public directory (Vercel will build this)
vercelApp.use(express.static(path.join(__dirname, "../public")));

// Use the main app for all routes
vercelApp.use(app);

// Export the Vercel app
export default vercelApp;
