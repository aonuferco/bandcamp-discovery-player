/**
 * url-state.ts
 * Manages URL query-param reading/writing.
 * Persists genre, mode, and page state in the URL bar.
 */

import type { Genre, DiscoveryMode } from '../../src/shared/types';
import { isValidGenre } from './genres';

export interface URLStateManager {
  /**
   * Parse URL parameters from the current window location.
   * Returns genre and mode, validating against known types.
   */
  parseUrlParams(): { genre: Genre | ""; mode: DiscoveryMode };

  /**
   * Update the URL to reflect current genre and mode.
   * Uses replaceState to avoid adding history entries.
   */
  updateUrl(genre: string, mode: DiscoveryMode): void;
}

/**
 * Validates that a mode string is a valid DiscoveryMode.
 */
const isValidMode = (mode: string | null | undefined): mode is DiscoveryMode =>
  mode === "new" || mode === "hot";

/**
 * Creates and returns a URLStateManager instance.
 */
export function createURLStateManager(): URLStateManager {
  return {
    parseUrlParams(): { genre: Genre | ""; mode: DiscoveryMode } {
      const params = new URLSearchParams(window.location.search);
      const genreParam = params.get("genre") || "";
      const modeParam = params.get("mode") || "new";

      return {
        genre: isValidGenre(genreParam) ? genreParam : "",
        mode: isValidMode(modeParam) ? modeParam : "new",
      };
    },

    updateUrl(genre: string, mode: DiscoveryMode): void {
      const params = new URLSearchParams();
      if (genre) params.set("genre", genre);
      if (mode !== "new") params.set("mode", mode);

      const queryString = params.toString();
      const newUrl = queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname;
      window.history.replaceState(null, "", newUrl);
    },
  };
}
