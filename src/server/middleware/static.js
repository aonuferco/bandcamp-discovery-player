import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function staticMiddleware(express) {
  // Handle both local development and Vercel deployment
  let projectRoot;
  try {
    // For local development
    projectRoot = path.resolve(__dirname, "../../../");
  } catch (error) {
    // For Vercel deployment, use current working directory
    projectRoot = process.cwd();
  }

  const publicPath = path.join(projectRoot, "public");

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
