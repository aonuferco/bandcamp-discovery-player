import express, { Request, Response } from "express";
import crypto from "crypto";

import {
  Album,
  AlbumsQueryParams,
  BandcampAlbumItem,
  BandcampApiBody,
  BandcampApiResponse,
} from "../types.js";
import {
  BANDCAMP_API_URL,
  API_HEADERS,
  REQUEST_TIMEOUT_MS,
  UPSTREAM_MAX_RETRIES,
  UPSTREAM_RETRY_MAX_DELAY_MS,
  UPSTREAM_RETRY_BASE_MS,
  STALE_CACHE_MAX_AGE_MS,
} from "../config.js";
import { validateQuery, albumsQuerySchema } from "../middleware/validate.js";

const router = express.Router();

export function isBandcampAlbumItem(item: unknown): item is BandcampAlbumItem {
  if (typeof item !== "object" || item === null) return false;

  const o = item as Record<string, unknown>;

  if (typeof o["id"] !== "number" && typeof o["item_id"] !== "number")
    return false;
  if (typeof o["title"] !== "string") return false;
  if (typeof o["band_name"] !== "string") return false;
  if (typeof o["item_url"] !== "string") return false;
  if (typeof o["result_type"] !== "string") return false;

  if (
    typeof o["primary_image"] !== "object" ||
    o["primary_image"] === null ||
    typeof (o["primary_image"] as Record<string, unknown>)["image_id"] !==
      "number"
  ) {
    return false;
  }

  if (
    o["album_artist"] !== undefined &&
    o["album_artist"] !== null &&
    typeof o["album_artist"] !== "string"
  )
    return false;
  if (
    o["label_name"] !== undefined &&
    o["label_name"] !== null &&
    typeof o["label_name"] !== "string"
  )
    return false;
  if (
    o["track_count"] !== undefined &&
    o["track_count"] !== null &&
    typeof o["track_count"] !== "number"
  )
    return false;
  if (
    o["release_date"] !== undefined &&
    o["release_date"] !== null &&
    typeof o["release_date"] !== "string"
  )
    return false;

  if (o["featured_track"] !== undefined && o["featured_track"] !== null) {
    const ft = o["featured_track"] as Record<string, unknown>;
    if (typeof ft !== "object") return false;
    if (typeof ft["title"] !== "string") return false;
    if (typeof ft["duration"] !== "number") return false;
    if (
      ft["stream_url"] !== undefined &&
      ft["stream_url"] !== null &&
      typeof ft["stream_url"] !== "string"
    )
      return false;
  }

  return true;
}

export function isBandcampApiResponse(
  data: unknown,
): data is BandcampApiResponse {
  if (
    typeof data !== "object" ||
    data === null ||
    !("results" in data) ||
    !Array.isArray((data as { results: unknown }).results) ||
    !("cursor" in data) ||
    typeof (data as { cursor: unknown }).cursor !== "string"
  ) {
    return false;
  }

  const results = (data as { results: unknown[] }).results;
  return results.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const o = item as Record<string, unknown>;
    if (o["result_type"] === "a") {
      return isBandcampAlbumItem(item);
    }
    return typeof o["result_type"] === "string";
  });
}

// In-memory cache (in production, consider Redis or similar)
const albumsCache = new Map<
  string,
  { albums: Album[]; expiresAt: number; storedAt: number }
>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const fetchingKeys = new Set<string>();

// Only throttling is retried. A genuine upstream failure is surfaced
// immediately rather than amplified into more requests.
const RETRYABLE_UPSTREAM_STATUSES = new Set([429, 503]);

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Reads a `Retry-After` header in either seconds or HTTP-date form. */
export function parseRetryAfterMs(header: string | null): number | null {
  if (header === null) return null;

  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const timestamp = Date.parse(header);
  if (!Number.isNaN(timestamp)) {
    return Math.max(0, timestamp - Date.now());
  }

  return null;
}

export const getApiBody = (
  slice: "new" | "hot" = "new",
  tag: string | null = "breakcore",
): BandcampApiBody => {
  const body: BandcampApiBody = {
    category_id: 0,
    tag_norm_names: tag ? [tag] : [],
    geoname_id: 0,
    time_facet_id: null,
    size: 60,
    include_result_types: ["a", "s"],
  };

  if (slice === "new") {
    body.slice = "new";
  } else if (slice === "hot") {
    body.slice = "top";
  }

  return body;
};

export function transformAlbumData(item: BandcampAlbumItem): Album {
  return {
    id: item.id || item.item_id || 0,
    title: item.title,
    artist: item.album_artist || item.band_name,
    img: `https://f4.bcbits.com/img/a${item.primary_image.image_id}_10.jpg`,
    link: item.item_url,
    stream_url: item?.featured_track?.stream_url ?? "",
    featured_track: item?.featured_track
      ? {
          title: item.featured_track.title,
          duration: item.featured_track.duration,
        }
      : null,
    label_name: item.label_name || null,
    track_count: item.track_count || 0,
    band_name: item.band_name,
    release_date: item.release_date || null,
  };
}

// Sanitize tag parameter

async function requestBandcampPage(
  cursor: string,
  slice: "new" | "hot",
  tag: string | null,
): Promise<BandcampApiResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: globalThis.Response;
  try {
    response = await fetch(BANDCAMP_API_URL, {
      method: "POST",
      headers: API_HEADERS,
      body: JSON.stringify({
        ...getApiBody(slice, tag),
        cursor,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `[TimeoutError] Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`,
      );
    }
    throw new Error(
      `[NetworkError] Failed to connect to Bandcamp API: ${(error as Error).message}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 429) {
    const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
    const suffix =
      retryAfterMs === null ? "" : ` (retry-after ${retryAfterMs} ms)`;
    throw new Error(
      `[RateLimitError] Bandcamp API rate limited the request${suffix}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `[HttpError] Bandcamp API responded with status: ${response.status}`,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(
      `[ParseError] Failed to parse Bandcamp API response: ${(error as Error).message}`,
    );
  }

  if (!isBandcampApiResponse(data)) {
    throw new Error(
      "[ParseError] Invalid response structure from Bandcamp API",
    );
  }
  return data;
}

function upstreamStatusOf(error: unknown): number | null {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("[RateLimitError]")) return 429;
  const match = /^\[HttpError\] Bandcamp API responded with status: (\d+)/.exec(
    message,
  );
  return match === null ? null : Number(match[1]);
}

async function fetchFromBandcamp(
  cursor: string,
  slice: "new" | "hot" = "new",
  tag: string | null = "breakcore",
): Promise<BandcampApiResponse> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= UPSTREAM_MAX_RETRIES; attempt++) {
    try {
      return await requestBandcampPage(cursor, slice, tag);
    } catch (error) {
      lastError = error;

      const status = upstreamStatusOf(error);
      const retryable =
        status !== null && RETRYABLE_UPSTREAM_STATUSES.has(status);
      if (!retryable || attempt === UPSTREAM_MAX_RETRIES) {
        throw error;
      }

      const message = error instanceof Error ? error.message : "";
      const hinted = /retry-after (\d+)ms/.exec(message);
      const backoff = Math.min(
        UPSTREAM_RETRY_BASE_MS * 2 ** attempt,
        UPSTREAM_RETRY_MAX_DELAY_MS,
      );
      const jitter = Math.floor(Math.random() * UPSTREAM_RETRY_BASE_MS);
      const waitMs =
        hinted === null
          ? backoff + jitter
          : Math.min(Number(hinted[1]), UPSTREAM_RETRY_MAX_DELAY_MS);
      await sleep(waitMs);
    }
  }
  throw lastError;
}

router.get(
  "/albums",
  validateQuery(albumsQuerySchema),
  async (
    req: Request<object, object, object, AlbumsQueryParams>,
    res: Response,
  ) => {
    const pageParam = req.query.page;
    const sliceParam = req.query.slice;
    const tagParam = req.query.tag;

    const page = pageParam !== undefined ? parseInt(pageParam, 10) : 1;
    const slice = (sliceParam as string) || "new";
    const tag = (tagParam as string) || null;

    const cacheKey = `${page}:${slice}:${tag || ""}`;
    const now = Date.now();

    // Serve from cache when available
    const cached = albumsCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      res.setHeader("Cache-Control", "public, max-age=300");
      return res.json(cached.albums);
    }

    // Prevent parallel fetches for the same key
    if (fetchingKeys.has(cacheKey)) {
      return res.status(429).json({ error: "Already fetching" });
    }

    fetchingKeys.add(cacheKey);

    try {
      // Fetch pages sequentially up to the requested page to obtain the correct cursor progression
      let cursor = "*";
      let pageAlbums: Album[] = [];

      for (let p = 1; p <= page; p++) {
        const data = await requestBandcampPage(
          cursor,
          slice as "new" | "hot",
          tag,
        );

        if (!data.results || !Array.isArray(data.results)) {
          throw new Error("Unexpected response format from Bandcamp API");
        }

        const newAlbums: Album[] = data.results
          .filter((item: BandcampAlbumItem) => item.result_type === "a")
          .map(transformAlbumData);

        if (p === page) {
          pageAlbums = newAlbums;
        }

        cursor = data.cursor;
      }

      // Cache the page result
      const storedAt = Date.now();
      albumsCache.set(cacheKey, {
        albums: pageAlbums,
        expiresAt: storedAt + CACHE_TTL_MS,
        storedAt,
      });
      // Set short-lived public cache header for clients
      res.setHeader("Cache-Control", "public, max-age=300");
      return res.json(pageAlbums);
    } catch (error) {
      const reqId = crypto.randomUUID();
      const message = error instanceof Error ? error.message : String(error);
      let category = "InternalError";
      let status = 500;

      if (message.startsWith("[")) {
        const endIdx = message.indexOf("]");
        if (endIdx !== -1) {
          category = message.substring(1, endIdx);
          if (category === "RateLimitError") {
            status = 503; // Upstream throttled us; the request is worth retrying
          } else if (category === "HttpError") {
            status = 502; // Upstream failure
          } else if (category === "ParseError") {
            status = 502; // Bad gateway / upstream returned garbage
          } else if (
            category === "NetworkError" ||
            category === "TimeoutError"
          ) {
            status = 504; // Gateway timeout
          }
        }
      }

      // eslint-disable-next-line no-console
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          reqId,
          category,
          message,
          stack: error instanceof Error ? error.stack : undefined,
        }),
      );

      // A stale page beats an error screen, especially when upstream is only
      // throttling us rather than failing outright.
      const stale = albumsCache.get(cacheKey);
      if (stale && Date.now() - stale.storedAt < STALE_CACHE_MAX_AGE_MS) {
        res.setHeader("Cache-Control", "public, max-age=60");
        res.setHeader("X-Albums-Cache", "stale");
        return res.json(stale.albums);
      }

      if (status === 503) {
        res.setHeader("Retry-After", "5");
      }

      res.status(status).json({
        error: "Failed to fetch albums",
        category,
        reqId,
      });
    } finally {
      fetchingKeys.delete(cacheKey);
    }
  },
);

export default router;
