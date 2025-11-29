import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// In-memory cache (in production, consider Redis or similar)
let cachedAlbums = [];
let lastCursor = "*";
let isFetching = false;

// Bandcamp API configuration
const BANDCAMP_API_URL = "https://bandcamp.com/api/discover/1/discover_web";
const API_HEADERS = {
  "Content-Type": "application/json",
  Origin: "https://bandcamp.com",
  Referer: "https://bandcamp.com/discover",
};

const getApiBody = (slice = "new", tag = "breakcore") => {
  const body = {
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

function transformAlbumData(item) {
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

async function fetchFromBandcamp(cursor, slice = "new", tag = "breakcore") {
  const response = await fetch(BANDCAMP_API_URL, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({
      ...getApiBody(slice, tag),
      cursor: cursor,
    }),
  });

  if (!response.ok) {
    throw new Error(`Bandcamp API error: ${response.status}`);
  }

  return await response.json();
}

router.get("/albums", async (req, res) => {
  if (isFetching) {
    return res.status(429).json({ error: "Already fetching" });
  }

  isFetching = true;

  try {
    const page = parseInt(req.query.page) || 1;
    const slice = req.query.slice || "new";
    const tag = req.query.tag || null;

    // Reset cursor if it's page 1 (fresh request/page reload)
    if (page === 1) {
      lastCursor = "*";
      cachedAlbums = [];
    }

    const data = await fetchFromBandcamp(lastCursor, slice, tag);

    if (!data.results || !Array.isArray(data.results)) {
      throw new Error("Unexpected response format from Bandcamp API");
    }

    const newAlbums = data.results
      .filter((item) => item.result_type === "a")
      .map(transformAlbumData);

    cachedAlbums.push(...newAlbums);
    lastCursor = data.cursor;

    res.json(newAlbums);
  } catch (error) {
    console.error("Error fetching albums:", error);
    res.status(500).json({
      error: "Failed to load albums",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    isFetching = false;
  }
});

export default router;
