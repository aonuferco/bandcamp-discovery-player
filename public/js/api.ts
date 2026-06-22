import type { Album, DiscoveryMode } from "../../src/shared/types";

export type ApiError = { type: 'network' | 'http' | 'timeout' | 'parse', message: string, status?: number };
export type FetchResult = { data: Album[] | null, error: ApiError | null };

export interface AlbumService {
  fetchAlbums(
    page?: number,
    mode?: DiscoveryMode,
    tag?: string,
  ): Promise<FetchResult>;
}

export function createAlbumService(): AlbumService {
  async function fetchAlbums(
    page: number = 1,
    mode: DiscoveryMode = "new",
    tag: string = "",
  ): Promise<FetchResult> {
    const tagParam = tag ? `&tag=${encodeURIComponent(tag)}` : "";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    let retries = 0;
    const maxRetries = 1;
    let response: Response | undefined;

    while (retries <= maxRetries) {
      try {
        response = await fetch(
          `/api/albums?page=${page}&slice=${mode}${tagParam}`,
          { signal: controller.signal },
        );
        break;
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return { data: null, error: { type: 'timeout', message: "Request timed out after 10 seconds" } };
        }
        if (retries < maxRetries) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
          continue;
        }
        return { data: null, error: { type: 'network', message: `Network failure: ${(err as Error).message}` } };
      }
    }

    clearTimeout(timeoutId);

    if (!response) {
      return { data: null, error: { type: 'network', message: "Failed to get response" } };
    }

    if (!response.ok) {
      return { data: null, error: { type: 'http', message: `HTTP error! status: ${response.status}`, status: response.status } };
    }

    try {
      const data: Album[] = await response.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { type: 'parse', message: "Failed to parse response" } };
    }
  }

  return { fetchAlbums };
}
