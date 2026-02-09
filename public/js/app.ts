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
  updateReleaseDate(album: Album): void;
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

  // Main UI update methods
  const showAlbum = (album: Album | undefined) => {
    if (!album) return;

    if (elements.loadingSpinner) {
      elements.loadingSpinner.classList.remove("hidden");
    }

    const tempImg = new Image();
    tempImg.onload = () => {
      if (elements.cover) elements.cover.src = tempImg.src;
      if (elements.loadingSpinner) elements.loadingSpinner.classList.add("hidden");
    };
    tempImg.src = album.img;

    if (elements.title) {
      elements.title.textContent = album.title;
      elements.title.title = album.title;
    }
    if (elements.artist) {
      elements.artist.textContent = `by ${album.artist}`;
    }

    updateTrackInfo(album);
    updateLabelInfo(album);
    updateTrackCount(album);
    updateReleaseDate(album);
    updateAudioPlayer(album);
  };

  const updateTrackInfo = (album: Album) => {
    if (!elements.trackInfo) return;

    if (!album.featured_track) {
      elements.trackInfo.innerHTML = "";
      elements.trackInfo.className = "track-info";
      return;
    }

    const trackText = album.featured_track.title;
    const fullText = `<strong>Featured Track:</strong> ${trackText}`;

    // Check if text needs marquee
    const tempElement = document.createElement("div");
    tempElement.style.cssText =
      "position: absolute; visibility: hidden; white-space: nowrap; font-size: 0.9rem; font-weight: 500;";
    tempElement.innerHTML = fullText;
    document.body.appendChild(tempElement);

    const textWidth = tempElement.offsetWidth;
    document.body.removeChild(tempElement);

    if (textWidth > 280) {
      elements.trackInfo.className = "track-info marquee";
      elements.trackInfo.innerHTML = `
        <div class="static-label">Featured Track:</div>
        <div class="marquee-container">
          <div class="marquee-content" data-text="${trackText}">
            ${trackText}
          </div>
        </div>
      `;
    } else {
      elements.trackInfo.className = "track-info";
      elements.trackInfo.innerHTML = fullText;
    }
  };

  const updateLabelInfo = (album: Album) => {
    if (!elements.labelInfo) return;
    elements.labelInfo.innerHTML = album.band_name 
      ? `<strong>Label:</strong> ${album.band_name}` 
      : "";
  };

  const updateTrackCount = (album: Album) => {
    if (!elements.trackCount) return;
    elements.trackCount.innerHTML = album.track_count && album.track_count > 0
      ? `<strong>Track Count:</strong> ${album.track_count}`
      : "";
  };

  const updateReleaseDate = (album: Album) => {
    if (!elements.releaseDate) return;
    if (album.release_date) {
      const dateObj = new Date(album.release_date);
      const formattedDate = dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      elements.releaseDate.innerHTML = `<strong>Release Date:</strong> ${formattedDate}`;
    } else {
      elements.releaseDate.innerHTML = "";
    }
  };

  const updateAudioPlayer = (album: Album) => {
    if (!elements.player) return;
    elements.player.innerHTML = `
      <audio controls autoplay style="width: 100%; height: 40px;">
        <source src="${album.stream_url}" type="audio/mp3" />
        Your browser does not support the audio element.
      </audio>
    `;

    const audio = elements.player.querySelector("audio");
    if (audio) {
      audio.volume = getSavedVolume();
      audio.addEventListener("volumechange", () => {
        saveVolume(audio.volume);
      });
    }
  };

  const preloadNextImages = (count = 3) => {
    const state = (window as any).appState;
    if (!state) return;

    for (let i = 1; i <= count; i++) {
      const albums = state.getAlbums();
      const nextItem = albums[state.getCurrentIndex() + i];
      if (nextItem?.img) {
        const img = new Image();
        img.src = nextItem.img;
      }
    }
  };

  // Create sub-managers
  const modalManager = createModalManager({
    helpModal: elements.helpModal,
    closeModal: elements.closeModal,
  });

  const toastManager = createToastManager({
    toastContainer: elements.toastContainer,
    loadingSpinner: elements.loadingSpinner,
    errorOverlay: elements.errorOverlay,
  });

  const genreDropdownManager = createGenreDropdownManager(
    {
      genreSearch: elements.genreSearch,
      genreDropdown: elements.genreDropdown,
    },
    () => (window as any).appState?.getCurrentTag() || ""
  );

  return {
    elements,
    showAlbum,
    updateTrackInfo,
    updateLabelInfo,
    updateTrackCount,
    updateReleaseDate,
    updateAudioPlayer,
    preloadNextImages,
    showToast: toastManager.showToast,
    showError: toastManager.showError,
    hideError: toastManager.hideError,
    openModal: modalManager.openModal,
    closeModal: modalManager.closeModal,
    renderGenreDropdown: genreDropdownManager.renderGenreDropdown,
    toggleDropdown: genreDropdownManager.toggleDropdown,
    updateSearchInput: genreDropdownManager.updateSearchInput,
  };
};
