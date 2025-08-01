import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function staticMiddleware(express) {
  // Try multiple possible paths for Vercel compatibility
  const possiblePaths = [
    path.resolve(__dirname, "../../../public"),
    path.resolve(__dirname, "../../public"),
    path.resolve(process.cwd(), "public"),
    "./public",
  ];

  const publicPath =
    possiblePaths.find((p) => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    }) || possiblePaths[0];

  console.log("Serving static files from:", publicPath);
  console.log("Current working directory:", process.cwd());

  try {
    const files = fs.readdirSync(publicPath);
    console.log("Available files in public:", files.join(", "));
  } catch (error) {
    console.log("Could not read public directory:", error.message);
  }

  return express.static(publicPath, {
    setHeaders: function (res, filePath) {
      if (filePath.endsWith("index.html")) {
        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");
      } else {
        res.set("Cache-Control", "public, max-age=86400");
      }
    },
  });
}
