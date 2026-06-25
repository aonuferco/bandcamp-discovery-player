// ============================================================================
// Bandcamp API Response Types
// ============================================================================

/**
 * Represents a single album/item in Bandcamp's API response.
 */
export interface BandcampAlbumItem {
  id?: number;
  item_id?: number;
  title: string;
  album_artist?: string;
  band_name: string;
  primary_image: {
    image_id: number;
  };
  item_url: string;
  featured_track?: {
    stream_url: string;
    title: string;
    duration: number;
  };
  label_name?: string;
  track_count?: number;
  release_date?: string;
  result_type: string;
}

/**
 * Full response structure from the Bandcamp discovery API.
 */
export interface BandcampApiResponse {
  results: BandcampAlbumItem[];
  cursor: string;
}

// ============================================================================
// Client-Facing Types
// ============================================================================

/**
 * Transformed album object sent to the frontend client.
 * This is the clean, normalized shape the UI expects.
 */
export interface Album {
  id: number;
  title: string;
  artist: string;
  img: string;
  link: string;
  stream_url: string;
  featured_track: {
    title: string;
    duration: number;
  } | null;
  label_name: string | null;
  track_count: number;
  band_name: string;
  release_date: string | null;
}

// ============================================================================
// Request/Query Types
// ============================================================================

/**
 * Slice configuration for Bandcamp API queries.
 * - `"new"` / `"hot"` are the user-facing values accepted by our `/api/albums` endpoint.
 * - `"top"` is an internal Bandcamp API value that `"hot"` maps to before the upstream request.
 */
export type SliceType = "new" | "hot" | "top";

/** User-facing discovery mode values accepted by the `/api/albums` endpoint. */
export type DiscoverySlice = "new" | "hot";

/**
 * Query parameters accepted by the /api/albums endpoint.
 */
export interface AlbumsQueryParams {
  page?: string;
  slice?: DiscoverySlice;
  tag?: string;
}

/**
 * Request body structure for calling Bandcamp's discovery API.
 */
export interface BandcampApiBody {
  category_id: number;
  tag_norm_names: string[];
  geoname_id: number;
  time_facet_id: number | null;
  size: number;
  include_result_types: string[];
  slice?: SliceType;
  cursor?: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Standard error response structure from our API.
 */
export interface ApiErrorResponse {
  error: string;
  details?: string;
}

/**
 * Health check response from /health endpoint.
 */
export interface HealthCheckResponse {
  status: "ok";
  timestamp: string;
}
