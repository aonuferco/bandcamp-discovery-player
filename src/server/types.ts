// ============================================================================
// Bandcamp API Response Types
// ============================================================================

/**
 * Represents a single album/item in Bandcamp's API response.
 */
export interface BandcampAlbumItem {
  id: number;
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
 * Query parameters accepted by the /api/albums endpoint.
 */
export interface AlbumsQueryParams {
  page?: string;
  slice?: "new" | "hot";
  tag?: string;
}

/**
 * Request body structure for calling Bandcamp's discovery API.
 */
export interface BandcampApiBody {
  category_id: number;
  tag_norm_names: string[];
  geoname_id: number;
  time_facet_id: null;
  size: number;
  include_result_types: string[];
  slice?: "new" | "top";
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
