export const PORT: number = parseInt(process.env['PORT'] || "3000", 10);

export const BANDCAMP_API_URL = "https://bandcamp.com/api/discover/1/discover_web";

export const API_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Origin: "https://bandcamp.com",
  Referer: "https://bandcamp.com/discover",
};

export const REQUEST_TIMEOUT_MS = 10000;
