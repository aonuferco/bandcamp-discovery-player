import type { Album, AlbumsApiResponse, DiscoveryMode } from '../../src/shared/types';

export interface AlbumService {
  fetchAlbums(page?: number, mode?: DiscoveryMode, tag?: string): Promise<Album[]>;
}

export function createAlbumService(): AlbumService {
  async function fetchAlbums(
    page: number = 1,
    mode: DiscoveryMode = 'new',
    tag: string = ''
  ): Promise<Album[]> {
    const tagParam = tag ? `&tag=${encodeURIComponent(tag)}` : '';
    const response = await fetch(
      `/api/albums?page=${page}&slice=${mode}${tagParam}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: AlbumsApiResponse = await response.json();
    return data.albums;
  }

  return { fetchAlbums };
}
