import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function staticMiddleware(express) {
  const projectRoot = process.env.VERCEL
    ? path.resolve(process.cwd(), "public")
    : path.resolve(__dirname, "../../../../public");
  return express.static(projectRoot, {
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
