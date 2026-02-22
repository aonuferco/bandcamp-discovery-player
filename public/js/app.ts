import { ALL_GENRES, type Genre, isValidGenre } from './genres';
import { createAppState, type AppState } from './state';
import { createAlbumService, type AlbumService } from './api';
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
  state: AppState;
  service: AlbumService;
  ui: UIManager;
  fetchAlbums(page?: number): Promise<void>;
  retryFetch(): Promise<void>;
  showCurrentAlbum(): void;
  nextAlbum(): Promise<void>;
  prevAlbum(): void;
  copyAlbumLink(): Promise<void>;
  openAlbumPage(): void;
  toggleAudio(): void;
  switchMode(mode: DiscoveryMode): Promise<void>;
  selectGenre(genre: string): Promise<void>;
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
      if (nextItem && nextItem.img) {
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

// ============================================================================
// App Controller
// ============================================================================

const createAppController = (): AppController => {
  const state = createAppState();
  const service = createAlbumService();
  const ui = createUIManager();

  const fetchAlbums = async (page = 1) => {
    state.setIsFetching(true);
    ui.hideError();

    try {
      const data = await service.fetchAlbums(
        page,
        state.getCurrentMode(),
        state.getCurrentTag()
      );

      // Filter out albums with missing stream URLs
      const validAlbums = data.filter((album) => {
        if (!album.stream_url) {
          console.warn("Skipping album with missing stream URL:", album.title);
          return false;
        }
        return true;
      });

      state.addAlbums(validAlbums);
      state.setLastError(null);

      // If no valid albums after filtering, show error
      if (validAlbums.length === 0 && state.getAlbums().length === 0) {
        ui.showError("No playable albums found. Try a different genre.");
      }
    } catch (error: any) {
      console.error("Error fetching albums:", error);
      state.setLastError(error instanceof Error ? error : new Error(error.message || "Failed to load albums"));

      // Show error overlay if we have no albums to display
      if (state.getAlbums().length === 0) {
        ui.showError("Failed to load albums. Please try again.");
      } else {
        // Just show toast if we already have some albums loaded
        ui.showToast("Failed to load more albums", "error");
      }
    } finally {
      state.setIsFetching(false);
    }
  };

  const retryFetch = async () => {
    if (ui.elements.loadingSpinner) {
      ui.elements.loadingSpinner.classList.remove("hidden");
    }
    ui.hideError();
    await fetchAlbums(state.getCurrentPage());
    if (state.getAlbums().length > 0) {
      showCurrentAlbum();
    }
  };

  const switchMode = async (mode: DiscoveryMode) => {
    if (mode === state.getCurrentMode()) return;

    state.setCurrentMode(mode);
    state.resetState();
    updateUrl(state.getCurrentTag(), mode);

    // Update button states and aria-pressed
    const isNew = mode === "new";
    if (ui.elements.newReleasesBtn) {
      ui.elements.newReleasesBtn.classList.toggle("active", isNew);
      ui.elements.newReleasesBtn.setAttribute("aria-pressed", isNew.toString());
    }
    if (ui.elements.hotBtn) {
      ui.elements.hotBtn.classList.toggle("active", !isNew);
      ui.elements.hotBtn.setAttribute("aria-pressed", (!isNew).toString());
    }

    // Show loading state
    const modeText = mode === "new" ? "new releases" : "hot releases";
    ui.showToast(`Switching to ${modeText}...`, "success");

    // Fetch new data
    await fetchAlbums(1);
    showCurrentAlbum();
  };

  const selectGenre = async (genre: string) => {
    if (genre === state.getCurrentTag()) return;

    state.setCurrentTag(genre);
    state.resetState();
    updateUrl(genre, state.getCurrentMode());
    ui.updateSearchInput(genre);
    ui.toggleDropdown(false);

    const genreText = genre || "all genres";
    ui.showToast(`Loading ${genreText}...`, "success");

    await fetchAlbums(1);
    showCurrentAlbum();
  };

  const showCurrentAlbum = () => {
    const album = state.getCurrentAlbum();
    ui.showAlbum(album);
    ui.preloadNextImages();
  };

  const nextAlbum = async () => {
    state.incrementCurrentIndex();

    if (state.needsMoreData() && !state.getIsFetching()) {
      state.incrementCurrentPage();
      await fetchAlbums(state.getCurrentPage());
    }

    if (state.getCurrentIndex() >= state.getAlbums().length) {
      state.setCurrentIndex(state.getAlbums().length - 1);
    }

    showCurrentAlbum();
  };

  const prevAlbum = () => {
    if (state.canGoPrev()) {
      state.decrementCurrentIndex();
      showCurrentAlbum();
    }
  };

  const copyAlbumLink = async () => {
    const album = state.getCurrentAlbum();
    if (album?.link) {
      try {
        await navigator.clipboard.writeText(album.link);
        ui.showToast("Album link copied to clipboard!", "success");
      } catch (err) {
        console.error("Failed to copy album link", err);
        ui.showToast("Failed to copy album link", "error");
      }
    }
  };

  const openAlbumPage = () => {
    const album = state.getCurrentAlbum();
    if (album?.link) {
      try {
        const url = new URL(album.link);
        if (
          url.hostname === "bandcamp.com" ||
          url.hostname.endsWith(".bandcamp.com")
        ) {
          window.open(album.link, "_blank");
          ui.showToast("Opening album page in new tab", "success");
        } else {
          ui.showToast("Invalid album URL", "error");
        }
      } catch (error) {
        ui.showToast("Invalid album URL", "error");
      }
    }
  };

  const toggleAudio = () => {
    const audio = document.querySelector("audio");
    if (audio) {
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    }
  };

  const seekAudio = (seconds: number) => {
    const audio = document.querySelector("audio");
    if (audio) {
      const newTime = audio.currentTime + seconds;
      audio.currentTime = Math.max(0, Math.min(newTime, audio.duration));
    }
  };

  const adjustVolume = (change: number) => {
    const audio = document.querySelector("audio");
    if (audio) {
      const newVolume = Math.max(0, Math.min(1, audio.volume + change));
      audio.volume = newVolume;
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    switch (e.key.toLowerCase()) {
      case "e":
        nextAlbum();
        break;
      case "q":
        prevAlbum();
        break;
      case "w":
        copyAlbumLink();
        break;
      case "s":
        openAlbumPage();
        break;
      case " ":
        e.preventDefault();
        toggleAudio();
        break;
      case "arrowleft":
        e.preventDefault();
        seekAudio(-10);
        break;
      case "arrowright":
        e.preventDefault();
        seekAudio(10);
        break;
      case "arrowup":
        e.preventDefault();
        adjustVolume(0.1);
        break;
      case "arrowdown":
        e.preventDefault();
        adjustVolume(-0.1);
        break;
      case "/":
        e.preventDefault();
        if (ui.elements.genreSearch) {
          ui.elements.genreSearch.focus();
        }
        break;
    }
  };

  const setupEventListeners = () => {
    // Button events
    ui.elements.nextBtn?.addEventListener("click", () => nextAlbum());
    ui.elements.prevBtn?.addEventListener("click", () => prevAlbum());
    ui.elements.helpBtn?.addEventListener("click", () => ui.openModal());
    ui.elements.closeModal?.addEventListener("click", () => ui.closeModal());
    ui.elements.retryBtn?.addEventListener("click", () => retryFetch());

    // Mode button events
    ui.elements.newReleasesBtn?.addEventListener("click", () => switchMode("new"));
    ui.elements.hotBtn?.addEventListener("click", () => switchMode("hot"));

    // Modal events
    ui.elements.helpModal?.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).id === "help-modal") {
        ui.closeModal();
      }
    });

    // Keyboard events
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        ui.closeModal();
        ui.toggleDropdown(false);
      }
    });

    // Search dropdown events
    const searchInput = ui.elements.genreSearch;
    const dropdown = ui.elements.genreDropdown;

    if (searchInput && dropdown) {
      searchInput.addEventListener("focus", () => {
        ui.renderGenreDropdown(searchInput.value);
        ui.toggleDropdown(true);
      });

      searchInput.addEventListener("input", (e) => {
        ui.renderGenreDropdown((e.target as HTMLInputElement).value);
        ui.toggleDropdown(true);
      });

      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          ui.toggleDropdown(false);
          searchInput.value = state.getCurrentTag();
          searchInput.blur();
        }
      });

      // Click outside to close dropdown
      document.addEventListener("click", (e) => {
        if (
          !searchInput.contains(e.target as Node) &&
          !dropdown.contains(e.target as Node)
        ) {
          ui.toggleDropdown(false);
          if (searchInput.value !== state.getCurrentTag()) {
            searchInput.value = state.getCurrentTag();
          }
        }
      });

      // Genre selection
      dropdown.addEventListener("click", (e) => {
        const item = (e.target as HTMLElement).closest(".genre-item") as HTMLElement;
        if (item && item.dataset['genre']) {
          selectGenre(item.dataset['genre']);
        }
      });
    }
  };

  const init = async () => {
    const { genre, mode } = parseUrlParams();

    if (mode !== "new") {
      state.setCurrentMode(mode);
      if (ui.elements.newReleasesBtn) {
        ui.elements.newReleasesBtn.classList.remove("active");
        ui.elements.newReleasesBtn.setAttribute("aria-pressed", "false");
      }
      if (ui.elements.hotBtn) {
        ui.elements.hotBtn.classList.add("active");
        ui.elements.hotBtn.setAttribute("aria-pressed", "true");
      }
    }

    if (genre) {
      state.setCurrentTag(genre);
      ui.updateSearchInput(genre);
    }

    await fetchAlbums(state.getCurrentPage());
    showCurrentAlbum();
  };

  return {
    state,
    service,
    ui,
    fetchAlbums,
    retryFetch,
    showCurrentAlbum,
    nextAlbum,
    prevAlbum,
    copyAlbumLink,
    openAlbumPage,
    toggleAudio,
    switchMode,
    selectGenre,
    setupEventListeners,
    init,
  };
};

// ============================================================================
// Initialization
// ============================================================================

declare global {
  interface Window {
    appState: AppState | null;
    appController: AppController | null;
  }
}

window.appState = null;
window.appController = null;

document.addEventListener("DOMContentLoaded", () => {
  const controller = createAppController();
  window.appController = controller;
  window.appState = controller.state;
  controller.setupEventListeners();
  controller.init();
});
