import express, { Request, Response } from "express";

import {
  Album,
  AlbumsQueryParams,
  BandcampAlbumItem,
  BandcampApiBody,
  BandcampApiResponse,
} from "../types.js";

const router = express.Router();

// In-memory cache (in production, consider Redis or similar)
let cachedAlbums: Album[] = [];
let lastCursor = "*";
let isFetching = false;

// Bandcamp API configuration
const BANDCAMP_API_URL = "https://bandcamp.com/api/discover/1/discover_web";
const API_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Origin: "https://bandcamp.com",
  Referer: "https://bandcamp.com/discover",
};

const getApiBody = (
  slice: "new" | "hot" = "new",
  tag: string | null = "breakcore"
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

function transformAlbumData(item: BandcampAlbumItem): Album {
  return {
    id: item.id,
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

// Request timeout configuration (10 seconds)
const REQUEST_TIMEOUT_MS = 10000;

async function fetchFromBandcamp(
  cursor: string,
  slice: "new" | "hot" = "new",
  tag: string | null = "breakcore"
): Promise<BandcampApiResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(BANDCAMP_API_URL, {
      method: "POST",
      headers: API_HEADERS,
      body: JSON.stringify({
        ...getApiBody(slice, tag),
        cursor,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Bandcamp API error: ${response.status}`);
    }

    return (await response.json()) as BandcampApiResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out after 10 seconds");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

router.get(
  "/albums",
  async (req: Request<object, object, object, AlbumsQueryParams>, res: Response) => {
    // Validate page parameter
    const pageParam = req.query.page;
    if (pageParam !== undefined) {
      const pageNum = parseInt(pageParam, 10);
      if (
        isNaN(pageNum) ||
        pageNum < 1 ||
        !Number.isInteger(Number(pageParam))
      ) {
        return res
          .status(400)
          .json({ error: "Invalid page parameter. Must be a positive integer." });
      }
    }

    // Validate slice parameter
    const sliceParam = req.query.slice;
    const validSlices: readonly string[] = ["new", "hot"];
    if (sliceParam !== undefined && !validSlices.includes(sliceParam)) {
      return res
        .status(400)
        .json({ error: "Invalid slice parameter. Must be 'new' or 'hot'." });
    }

    // Sanitize tag parameter
    let tagParam = req.query.tag;
    if (tagParam !== undefined) {
      tagParam = tagParam.trim().toLowerCase().slice(0, 50);
      const tagPattern = /^[a-z0-9\-\s]*$/;
      if (!tagPattern.test(tagParam)) {
        return res.status(400).json({
          error:
            "Invalid tag parameter. Only letters, numbers, hyphens, and spaces allowed.",
        });
      }
    }

    if (isFetching) {
      return res.status(429).json({ error: "Already fetching" });
    }

    isFetching = true;

    try {
      const page = pageParam !== undefined ? parseInt(pageParam, 10) : 1;
      const slice = sliceParam || "new";
      const tag = tagParam || null;

      // Reset cursor if it's page 1 (fresh request/page reload)
      if (page === 1) {
        lastCursor = "*";
        cachedAlbums = [];
      }

      const data = await fetchFromBandcamp(lastCursor, slice, tag);

      if (!data.results || !Array.isArray(data.results)) {
        throw new Error("Unexpected response format from Bandcamp API");
      }

      const newAlbums: Album[] = data.results
        .filter((item: BandcampAlbumItem) => item.result_type === "a")
        .map(transformAlbumData);

      cachedAlbums.push(...newAlbums);
      lastCursor = data.cursor;

      res.json(newAlbums);
    } catch (error) {
      console.error("Error fetching albums:", error);
      res.status(500).json({
        error: "Failed to load albums",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      });
    } finally {
      isFetching = false;
    }
  }
);

export default router;
