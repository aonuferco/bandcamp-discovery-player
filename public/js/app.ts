import { ALL_GENRES, type Genre, isValidGenre } from './genres';
import { createAppState } from './state';
import { createAlbumService } from './api';
import { createModalManager } from './ui/modal';
import { createToastManager } from './ui/toast';
import { createGenreDropdownManager } from './ui/genre-dropdown';
import type { Album, DiscoveryMode } from '../../src/shared/types';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ToastType = 'success' | 'error';

export interface UIElements {
  cover: HTMLImageElement | null;
  title: HTMLElement | null;
  artist: HTMLElement | null;
  trackInfo: HTMLElement | null;
  labelInfo: HTMLElement | null;
  trackCount: HTMLElement | null;
  releaseDate: HTMLElement | null;
  player: HTMLElement | null;
  nextBtn: HTMLButtonElement | null;
  prevBtn: HTMLButtonElement | null;
  helpBtn: HTMLButtonElement | null;
  helpModal: HTMLElement | null;
  closeModal: HTMLButtonElement | null;
  toastContainer: HTMLElement | null;
  newReleasesBtn: HTMLButtonElement | null;
  hotBtn: HTMLButtonElement | null;
  genreSearch: HTMLInputElement | null;
  genreDropdown: HTMLElement | null;
  loadingSpinner: HTMLElement | null;
  errorOverlay: HTMLElement | null;
  retryBtn: HTMLButtonElement | null;
}

export interface UIManager {
  elements: UIElements;
  showAlbum(album: Album | undefined): void;
  updateTrackInfo(album: Album): void;
  updateLabelInfo(album: Album): void;
  updateTrackCount(album: Album): void;
  updateAudioPlayer(album: Album): void;
  preloadNextImages(count?: number): void;
  showToast(message: string, type?: ToastType): void;
  showError(message?: string): void;
  hideError(): void;
  openModal(): void;
  closeModal(): void;
  renderGenreDropdown(filter?: string): boolean;
  toggleDropdown(show: boolean): void;
  updateSearchInput(tag: string): void;
}

export interface AppController {
  state: any; // Will be properly typed when state.ts is fully integrated
  service: any; // Will be properly typed when api.ts is fully integrated
  ui: UIManager;
  fetchAlbums(page?: number): Promise<void>;
  retryFetch(): Promise<void>;
  showCurrentAlbum(): void;
  nextAlbum(): Promise<void>;
  prevAlbum(): void;
  copyAlbumLink(): Promise<void>;
  toggleAudio(): void;
  switchMode(mode: DiscoveryMode): Promise<void>;
  setupEventListeners(): void;
  init(): Promise<void>;
}

// ============================================================================
// URL Utilities
// ============================================================================

const isValidMode = (mode: string | null | undefined): mode is DiscoveryMode => 
  mode === "new" || mode === "hot";

const parseUrlParams = (): { genre: Genre | ""; mode: DiscoveryMode } => {
  const params = new URLSearchParams(window.location.search);
  const genreParam = params.get("genre") || "";
  const modeParam = params.get("mode") || "new";

  return {
    genre: isValidGenre(genreParam) ? genreParam : "",
    mode: isValidMode(modeParam) ? modeParam : "new",
  };
};

const updateUrl = (genre: string, mode: DiscoveryMode): void => {
  const params = new URLSearchParams();
  if (genre) params.set("genre", genre);
  if (mode !== "new") params.set("mode", mode);
  
  const queryString = params.toString();
  const newUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;
  window.history.replaceState(null, "", newUrl);
};

// ============================================================================
// UI Manager Shell
// ============================================================================

const createUIManager = (): UIManager => {
  const elements: UIElements = {
    cover: document.getElementById("cover") as HTMLImageElement | null,
    title: document.getElementById("title"),
    artist: document.getElementById("artist"),
    trackInfo: document.getElementById("track-info"),
    labelInfo: document.getElementById("label-info"),
    trackCount: document.getElementById("track-count"),
    releaseDate: document.getElementById("release-date"),
    player: document.getElementById("player"),
    nextBtn: document.getElementById("next-btn") as HTMLButtonElement | null,
    prevBtn: document.getElementById("prev-btn") as HTMLButtonElement | null,
    helpBtn: document.getElementById("help-btn") as HTMLButtonElement | null,
    helpModal: document.getElementById("help-modal"),
    closeModal: document.getElementById("close-modal") as HTMLButtonElement | null,
    toastContainer: document.getElementById("toast-container"),
    newReleasesBtn: document.getElementById("new-releases-btn") as HTMLButtonElement | null,
    hotBtn: document.getElementById("hot-btn") as HTMLButtonElement | null,
    genreSearch: document.getElementById("genre-search") as HTMLInputElement | null,
    genreDropdown: document.getElementById("genre-dropdown"),
    loadingSpinner: document.getElementById("loading-spinner"),
    errorOverlay: document.getElementById("error-overlay"),
    retryBtn: document.getElementById("retry-btn") as HTMLButtonElement | null,
  };

  // Helper logic: Volume management
  const getSavedVolume = (): number => {
    const saved = localStorage.getItem("bandcamp-volume");
    return saved ? parseFloat(saved) : 0.2;
  };

  const saveVolume = (volume: number): void => {
    localStorage.setItem("bandcamp-volume", volume.toString());
  };

  // Placeholder implementations for Day 2
  const showAlbum = (album: Album | undefined) => {};
  const updateTrackInfo = (album: Album) => {};
  const updateLabelInfo = (album: Album) => {};
  const updateTrackCount = (album: Album) => {};
  const updateAudioPlayer = (album: Album) => {};
  const preloadNextImages = (count = 3) => {};

  // Delegate logic placeholders (to be connected in Day 2)
  return {
    elements,
    showAlbum,
    updateTrackInfo,
    updateLabelInfo,
    updateTrackCount,
    updateAudioPlayer,
    preloadNextImages,
    showToast: (message, type) => {},
    showError: (message) => {},
    hideError: () => {},
    openModal: () => {},
    closeModal: () => {},
    renderGenreDropdown: () => false,
    toggleDropdown: () => {},
    updateSearchInput: () => {},
  };
};
