import type { Album, DiscoveryMode } from '../../src/shared/types';
import type { Genre } from './genres';

export interface AppState {
  addAlbums(newAlbums: Album[]): void;
  getCurrentAlbum(): Album | undefined;
  canGoNext(): boolean;
  canGoPrev(): boolean;
  needsMoreData(): boolean;
  getAlbums(): Album[];
  getCurrentIndex(): number;
  getCurrentPage(): number;
  getIsFetching(): boolean;
  getCurrentMode(): DiscoveryMode;
  getCurrentTag(): string;
  getLastError(): Error | null;
  setCurrentIndex(index: number): void;
  setCurrentPage(page: number): void;
  setIsFetching(fetching: boolean): void;
  setCurrentMode(mode: DiscoveryMode): void;
  setCurrentTag(tag: string): void;
  setLastError(error: Error | null): void;
  incrementCurrentIndex(): void;
  decrementCurrentIndex(): void;
  incrementCurrentPage(): void;
  resetState(): void;
}

export function createAppState(): AppState {
  let albums: Album[] = [];
  let currentIndex: number = 0;
  let currentPage: number = 1;
  let preloadThreshold: number = 3;
  let isFetching: boolean = false;
  let seenLinks: Set<string> = new Set();
  let currentMode: DiscoveryMode = 'new';
  let currentTag: string = '';
  let lastError: Error | null = null;

  return {
    addAlbums(newAlbums: Album[]): void {
      const filteredAlbums = newAlbums.filter((album) => {
        if (seenLinks.has(album.link)) return false;
        seenLinks.add(album.link);
        return true;
      });
      albums.push(...filteredAlbums);
    },

    getCurrentAlbum(): Album | undefined {
      return albums[currentIndex];
    },

    canGoNext(): boolean {
      return currentIndex < albums.length - 1;
    },

    canGoPrev(): boolean {
      return currentIndex > 0;
    },

    needsMoreData(): boolean {
      return albums.length - currentIndex <= preloadThreshold;
    },

    // Getters and setters for state
    getAlbums(): Album[] {
      return albums;
    },

    getCurrentIndex(): number {
      return currentIndex;
    },

    getCurrentPage(): number {
      return currentPage;
    },

    getIsFetching(): boolean {
      return isFetching;
    },

    getCurrentMode(): DiscoveryMode {
      return currentMode;
    },

    getCurrentTag(): string {
      return currentTag;
    },

    getLastError(): Error | null {
      return lastError;
    },

    setCurrentIndex(index: number): void {
      currentIndex = index;
    },

    setCurrentPage(page: number): void {
      currentPage = page;
    },

    setIsFetching(fetching: boolean): void {
      isFetching = fetching;
    },

    setCurrentMode(mode: DiscoveryMode): void {
      currentMode = mode;
    },

    setCurrentTag(tag: string): void {
      currentTag = tag;
    },

    setLastError(error: Error | null): void {
      lastError = error;
    },

    incrementCurrentIndex(): void {
      currentIndex++;
    },

    decrementCurrentIndex(): void {
      currentIndex--;
    },

    incrementCurrentPage(): void {
      currentPage++;
    },

    resetState(): void {
      albums = [];
      currentIndex = 0;
      currentPage = 1;
      seenLinks = new Set();
      lastError = null;
    },
  };
}
