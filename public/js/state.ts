import type { Album, DiscoveryMode } from '../../src/shared/types';

// Event types for state changes
export type StateEventType =
  | 'albumsAdded'
  | 'currentIndexChanged'
  | 'currentPageChanged'
  | 'isFetchingChanged'
  | 'currentModeChanged'
  | 'currentTagChanged'
  | 'lastErrorChanged'
  | 'stateReset';

export type StateEventListener<T = any> = (value: T) => void;

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
  // Event emitter interface
  readonly on: <T = any>(event: StateEventType, listener: StateEventListener<T>) => void;
  readonly off: <T = any>(event: StateEventType, listener: StateEventListener<T>) => void;
  readonly emit: <T = any>(event: StateEventType, value?: T) => void;
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

  // Event emitter storage
  const listeners = new Map<StateEventType, Set<StateEventListener>>();

  const emit = <T = any>(event: StateEventType, value?: T) => {
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => listener(value));
    }
  };

  const on = <T = any>(event: StateEventType, listener: StateEventListener<T>) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(listener as StateEventListener);
  };

  const off = <T = any>(event: StateEventType, listener: StateEventListener<T>) => {
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener as StateEventListener);
    }
  };

  return {
    addAlbums(newAlbums: Album[]): void {
      const filteredAlbums = newAlbums.filter((album) => {
        if (seenLinks.has(album.link)) return false;
        seenLinks.add(album.link);
        return true;
      });
      albums.push(...filteredAlbums);
      emit('albumsAdded', filteredAlbums);
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
      emit('currentIndexChanged', index);
    },

    setCurrentPage(page: number): void {
      currentPage = page;
      emit('currentPageChanged', page);
    },

    setIsFetching(fetching: boolean): void {
      isFetching = fetching;
      emit('isFetchingChanged', fetching);
    },

    setCurrentMode(mode: DiscoveryMode): void {
      currentMode = mode;
      emit('currentModeChanged', mode);
    },

    setCurrentTag(tag: string): void {
      currentTag = tag;
      emit('currentTagChanged', tag);
    },

    setLastError(error: Error | null): void {
      lastError = error;
      emit('lastErrorChanged', error);
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
      emit('stateReset');
    },

    on,
    off,
    emit,
  };
}
