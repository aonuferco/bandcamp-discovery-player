import type { Album, DiscoveryMode } from "../../src/shared/types";

export type ApiError = {
  type: "network" | "http" | "timeout" | "parse";
  message: string;
  status?: number;
};
export type FetchResult = { data: Album[] | null; error: ApiError | null };

export interface AlbumService {
  fetchAlbums(
    page?: number,
    mode?: DiscoveryMode,
    tag?: string,
  ): Promise<FetchResult>;
}

// Upstream throttling surfaces as 503 (Bandcamp rate limited us) or 429
// (a fetch for the same page is already in flight). Both clear up on retry.
const THROTTLED_STATUSES = new Set([429, 503]);

export function createAlbumService(baseUrl: string = ""): AlbumService {
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
    let throttleRetries = 0;
    const maxThrottleRetries = 2;
    let response: Response | undefined;

    while (true) {
      try {
        response = await fetch(
          `${baseUrl}/api/albums?page=${page}&slice=${mode}${tagParam}`,
          { signal: controller.signal },
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return {
            data: null,
            error: {
              type: "timeout",
              message: "Request timed out after 10 seconds",
            },
          };
        }
        if (retries < maxRetries) {
          retries++;
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, retries - 1)),
          );
          continue;
        }
        return {
          data: null,
          error: {
            type: "network",
            message: `Network failure: ${(err as Error).message}`,
          },
        };
      }

      if (
        THROTTLED_STATUSES.has(response.status) &&
        throttleRetries < maxThrottleRetries
      ) {
        throttleRetries++;
        const retryAfter = Number(response?.headers.get("retry-after"));
        const waitMs =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter * 1000, 3000)
            : 500 * Math.pow(2, throttleRetries - 1);
        response = undefined;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      break;
    }

    clearTimeout(timeoutId);

    if (!response) {
      return {
        data: null,
        error: { type: "network", message: "Failed to get response" },
      };
    }

    if (!response.ok) {
      return {
        data: null,
        error: {
          type: "http",
          message: `HTTP error! status: ${response.status}`,
          status: response.status,
        },
      };
    }

    try {
      const data: Album[] = await response.json();
      return { data, error: null };
    } catch {
      return {
        data: null,
        error: { type: "parse", message: "Failed to parse response" },
      };
    }
  }

  return { fetchAlbums };
}
