export const PORT: number = parseInt(process.env["PORT"] || "3000", 10);

export const BANDCAMP_API_URL =
  "https://bandcamp.com/api/discover/1/discover_web";

export const API_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Origin: "https://bandcamp.com",
  Referer: "https://bandcamp.com/discover",
};

export const REQUEST_TIMEOUT_MS = 8000;

// Bandcamp rate-limits per caller IP. Shared hosting egress IPs trip the limit
// far more easily than a single home connection, so retry 429s before failing.
export const UPSTREAM_MAX_RETRIES = 3;
export const UPSTREAM_RETRY_BASE_MS = 400;
export const UPSTREAM_RETRY_MAX_DELAY_MS = 4000;

// How long an expired cache entry may still be served when upstream is
// rate-limiting us. Stale albums beat an error screen.
export const STALE_CACHE_MAX_AGE_MS = 60 * 60 * 1000;
