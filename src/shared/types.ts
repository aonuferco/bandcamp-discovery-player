// Shared types between frontend and backend

// Discovery mode type
export type DiscoveryMode = 'new' | 'hot';

// Featured track information
export interface FeaturedTrack {
  title: string;
  duration: number;
}

// Album data structure (used by both frontend and backend)
export interface Album {
  id: string;
  title: string;
  artist: string;
  img: string;
  link: string;
  stream_url: string;
  featured_track?: FeaturedTrack;
  band_name?: string;
  track_count?: number;
  release_date?: string;
}

// API response structure
export interface AlbumsApiResponse {
  albums: Album[];
  hasMore: boolean;
}
