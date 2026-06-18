import type { Album, DiscoveryMode } from "../../src/shared/types";

export interface AlbumService {
  fetchAlbums(
    page?: number,
    mode?: DiscoveryMode,
    tag?: string,
  ): Promise<Album[]>;
}

export function createAlbumService(baseUrl: string = ""): AlbumService {
  async function fetchAlbums(
    page: number = 1,
    mode: DiscoveryMode = "new",
    tag: string = "",
  ): Promise<Album[]> {
    const tagParam = tag ? `&tag=${encodeURIComponent(tag)}` : "";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    let response: Response;
    try {
      response = await fetch(
        `${baseUrl}/api/albums?page=${page}&slice=${mode}${tagParam}`,
        { signal: controller.signal },
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        throw new Error("Request timed out after 10 seconds");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: Album[] = await response.json();
    return data;
  }

  return { fetchAlbums };
}
