import type { Album, DiscoveryMode } from '../../src/shared/types';


export interface AppState {
  readonly addAlbums: (newAlbums: Album[]) => void;
  readonly getCurrentAlbum: () => Album | undefined;
  readonly canGoNext: () => boolean;
  readonly canGoPrev: () => boolean;
  readonly needsMoreData: () => boolean;
  readonly getAlbums: () => Album[];
  readonly getCurrentIndex: () => number;
  readonly getCurrentPage: () => number;
  readonly getIsFetching: () => boolean;
  readonly getCurrentMode: () => DiscoveryMode;
  readonly getCurrentTag: () => string;
  readonly getLastError: () => Error | null;
  readonly setCurrentIndex: (index: number) => void;
  readonly setCurrentPage: (page: number) => void;
  readonly setIsFetching: (fetching: boolean) => void;
  readonly setCurrentMode: (mode: DiscoveryMode) => void;
  readonly setCurrentTag: (tag: string) => void;
  readonly setLastError: (error: Error | null) => void;
  readonly incrementCurrentIndex: () => void;
  readonly decrementCurrentIndex: () => void;
  readonly incrementCurrentPage: () => void;
  readonly resetState: () => void;
}

export function createAppState(): AppState {
  let albums: Album[] = [];
  let currentIndex: number = 0;
  let currentPage: number = 1;
  const preloadThreshold: number = 3;
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
      isFetching = false;
      seenLinks = new Set();
      lastError = null;
    },
  };
}
