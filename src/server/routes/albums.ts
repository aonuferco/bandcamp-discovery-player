import express, { Request, Response } from "express";
import crypto from "crypto";

import {
  Album,
  AlbumsQueryParams,
  BandcampAlbumItem,
  BandcampApiBody,
  BandcampApiResponse,
} from "../types.js";
import { BANDCAMP_API_URL, API_HEADERS, REQUEST_TIMEOUT_MS } from "../config.js";
import { validateQuery, albumsQuerySchema } from "../middleware/validate.js";

const router = express.Router();

export function isBandcampAlbumItem(item: unknown): item is BandcampAlbumItem {
  if (typeof item !== "object" || item === null) return false;
  
  const o = item as Record<string, unknown>;
  
  if (typeof o['id'] !== "number" && typeof o['item_id'] !== "number") return false;
  if (typeof o['title'] !== "string") return false;
  if (typeof o['band_name'] !== "string") return false;
  if (typeof o['item_url'] !== "string") return false;
  if (typeof o['result_type'] !== "string") return false;
  
  if (
    typeof o['primary_image'] !== "object" ||
    o['primary_image'] === null ||
    typeof (o['primary_image'] as Record<string, unknown>)['image_id'] !== "number"
  ) {
    return false;
  }
  
  if (o['album_artist'] !== undefined && o['album_artist'] !== null && typeof o['album_artist'] !== "string") return false;
  if (o['label_name'] !== undefined && o['label_name'] !== null && typeof o['label_name'] !== "string") return false;
  if (o['track_count'] !== undefined && o['track_count'] !== null && typeof o['track_count'] !== "number") return false;
  if (o['release_date'] !== undefined && o['release_date'] !== null && typeof o['release_date'] !== "string") return false;
  
  if (o['featured_track'] !== undefined && o['featured_track'] !== null) {
    const ft = o['featured_track'] as Record<string, unknown>;
    if (typeof ft !== "object") return false;
    if (typeof ft['title'] !== "string") return false;
    if (typeof ft['duration'] !== "number") return false;
    if (ft['stream_url'] !== undefined && ft['stream_url'] !== null && typeof ft['stream_url'] !== "string") return false;
  }
  
  return true;
}

export function isBandcampApiResponse(data: unknown): data is BandcampApiResponse {
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
    if (o['result_type'] === "a") {
      return isBandcampAlbumItem(item);
    }
    return typeof o['result_type'] === "string";
  });
}

// In-memory cache (in production, consider Redis or similar)
const albumsCache = new Map<string, { albums: Album[]; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const fetchingKeys = new Set<string>();

export const getApiBody = (slice: "new" | "hot" = "new", tag: string | null = "breakcore"): BandcampApiBody => {
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

async function fetchFromBandcamp(
  cursor: string,
  slice: "new" | "hot" = "new",
  tag: string | null = "breakcore"
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
      throw new Error(`[TimeoutError] Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`);
    }
    throw new Error(`[NetworkError] Failed to connect to Bandcamp API: ${(error as Error).message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`[HttpError] Bandcamp API responded with status: ${response.status}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(`[ParseError] Failed to parse Bandcamp API response: ${(error as Error).message}`);
  }

  if (!isBandcampApiResponse(data)) {
    throw new Error("[ParseError] Invalid response structure from Bandcamp API");
  }
  return data;
}

router.get(
  "/albums",
  validateQuery(albumsQuerySchema),
  async (req: Request<object, object, object, AlbumsQueryParams>, res: Response) => {
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
        const data = await fetchFromBandcamp(cursor, slice as "new" | "hot", tag);

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
      albumsCache.set(cacheKey, { albums: pageAlbums, expiresAt: Date.now() + CACHE_TTL_MS });

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
          if (category === "HttpError") {
            status = 502; // Upstream failure
          } else if (category === "ParseError") {
            status = 502; // Bad gateway / upstream returned garbage
          } else if (category === "NetworkError" || category === "TimeoutError") {
            status = 504; // Gateway timeout
          }
        }
      }

      // eslint-disable-next-line no-console
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        reqId,
        category,
        message,
        stack: error instanceof Error ? error.stack : undefined
      }));

      res.status(status).json({
        error: "Failed to fetch albums",
        reqId,
      });
    } finally {
      fetchingKeys.delete(cacheKey);
    }
  }
);

export default router;
