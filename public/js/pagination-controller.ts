/**
 * pagination-controller.ts
 * Manages page/album navigation and preloading logic.
 * Handles infinite-scroll-style "load more" and prefetching.
 */

import type { Album, DiscoveryMode } from '../../src/shared/types';
import type { AppState } from './state';

export interface PaginationController {
  /**
   * Check if more data is needed to support infinite scrolling.
   * Returns true if current index is approaching the end of loaded albums.
   */
  needsMoreData(): boolean;

  /**
   * Advance to the next album.
   * Automatically triggers page fetch if needed.
   */
  nextAlbum(onFetch: () => Promise<void>): Promise<void>;

  /**
   * Go back to the previous album.
   */
  prevAlbum(): void;

  /**
   * Preload images for the next N albums.
   * Improves perceived performance during navigation.
   */
  preloadNextImages(count?: number): void;

  /**
   * Get the current album.
   */
  getCurrentAlbum(): Album | undefined;

  /**
   * Check if forward navigation is possible.
   */
  canGoNext(): boolean;

  /**
   * Check if backward navigation is possible.
   */
  canGoPrev(): boolean;
}

/**
 * Creates and returns a PaginationController instance.
 */
export function createPaginationController(state: AppState): PaginationController {
  const preloadThreshold = 3;

  return {
    needsMoreData(): boolean {
      const albums = state.getAlbums();
      const currentIndex = state.getCurrentIndex();
      return albums.length - currentIndex <= preloadThreshold;
    },

    async nextAlbum(onFetch: () => Promise<void>): Promise<void> {
      state.incrementCurrentIndex();

      if (this.needsMoreData() && !state.getIsFetching()) {
        state.incrementCurrentPage();
        await onFetch();
      }

      const albums = state.getAlbums();
      if (state.getCurrentIndex() >= albums.length) {
        state.setCurrentIndex(albums.length - 1);
      }
    },

    prevAlbum(): void {
      if (this.canGoPrev()) {
        state.decrementCurrentIndex();
      }
    },

    preloadNextImages(count = 3): void {
      for (let i = 1; i <= count; i++) {
        const albums = state.getAlbums();
        const nextItem = albums[state.getCurrentIndex() + i];
        if (nextItem && nextItem.img) {
          const img = new Image();
          img.src = nextItem.img;
        }
      }
    },

    getCurrentAlbum(): Album | undefined {
      return state.getCurrentAlbum();
    },

    canGoNext(): boolean {
      const albums = state.getAlbums();
      return state.getCurrentIndex() < albums.length - 1;
    },

    canGoPrev(): boolean {
      return state.getCurrentIndex() > 0;
    },
  };
}
