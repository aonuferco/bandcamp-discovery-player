import { type Genre, getGenreFamily, isValidGenre } from './genres';
import { createAppState, type AppState } from './state';
import { createAlbumService, type AlbumService } from './api';
import { createModalManager } from './ui/modal';
import { createToastManager } from './ui/toast';
import { createGenreDropdownManager } from './ui/genre-dropdown';
import { createAudioController, type AudioController } from './audio-controller';
import { createKeyboardController, type KeyboardHandler } from './keyboard-controller';
import { createPaginationController, type PaginationController } from './pagination-controller';
import { createURLStateManager, type URLStateManager } from './url-state';
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
  coverContainer: HTMLElement | null;
  errorOverlay: HTMLElement | null;
  retryBtn: HTMLButtonElement | null;
  copyLinkFab: HTMLButtonElement | null;
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
  navigateDropdown(direction: 'up' | 'down'): void;
  getHighlightedGenre(): string | null;
}

export interface AppController {
  state: AppState;
  service: AlbumService;
  ui: UIManager;
  fetchAlbums(page?: number): Promise<void>;
  retryFetch(): Promise<void>;
  showCurrentAlbum(): Promise<void>;
  nextAlbum(): Promise<void>;
  prevAlbum(): Promise<void>;
  copyAlbumLink(): Promise<void>;
  openAlbumPage(): void;
  toggleAudio(): void;
  seekAudio(seconds: number): void;
  switchMode(mode: DiscoveryMode): Promise<void>;
  selectGenre(genre: string): Promise<void>;
  setupEventListeners(): void;
  init(): Promise<void>;
}

// ============================================================================
// Utility Functions
// ============================================================================

export const isTouchDevice = (): boolean =>
  window.matchMedia("(pointer: coarse)").matches;

export const applyGenreTheme = (genre: string, mode: DiscoveryMode): void => {
  // Remove any existing genre theme classes
  Array.from(document.body.classList)
    .filter(c => c.startsWith('genre-theme-'))
    .forEach(c => document.body.classList.remove(c));

  if (!genre) {
    // No genre selected — apply the mode-level theme (hot / new)
    document.body.classList.add(`genre-theme-${mode}`);
  } else {
    // Genre selected — apply the family+mode theme
    const family = getGenreFamily(genre);
    if (family) {
      document.body.classList.add(`genre-theme-${family}-${mode}`);
    }
  }
};

// ============================================================================
// Touch Navigation
// ============================================================================

export const setupTouchNavigation = (
  nextAlbum: () => void,
  prevAlbum: () => void
): void => {
  const albumEl = document.getElementById("album");
  if (!albumEl) return;

  const SWIPE_THRESHOLD = 50;
  const AXIS_LOCK = 30;

  let touchStartX = 0;
  let touchStartY = 0;
  let currentDx = 0;
  let isDragging = false;

  const setDragTranslate = (dx: number) => {
    albumEl.style.transition = "none";
    albumEl.style.transform = `rotate(-1.5deg) translateX(${dx}px)`;
  };

  const clearSwipeClasses = () => {
    albumEl.classList.remove(
      "swipe-exit-left", "swipe-exit-right",
      "swipe-enter-left", "swipe-enter-right"
    );
  };

  const resetTransform = () => {
    clearSwipeClasses();
    albumEl.style.transition = "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    albumEl.style.transform = "";
    albumEl.addEventListener(
      "transitionend",
      () => {
        albumEl.style.transition = "";
        albumEl.style.transform = "";
      },
      { once: true }
    );
  };

  albumEl.addEventListener("touchstart", (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    currentDx = 0;
    isDragging = true;
    albumEl.style.transition = "none";
  }, { passive: true });

  albumEl.addEventListener("touchmove", (e: TouchEvent) => {
    if (!isDragging) return;
    const t = e.touches[0];
    if (!t) return;

    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;

    if (Math.abs(dy) > AXIS_LOCK && Math.abs(dx) < SWIPE_THRESHOLD) {
      isDragging = false;
      resetTransform();
      return;
    }

    currentDx = dx;
    setDragTranslate(dx);
  }, { passive: true });

  albumEl.addEventListener("touchend", () => {
    if (!isDragging) return;
    isDragging = false;

    if (currentDx < -SWIPE_THRESHOLD) {
      albumEl.style.transition = "";
      albumEl.style.transform = "";
      albumEl.classList.add("swipe-exit-left");

      albumEl.addEventListener("animationend", () => {
        albumEl.classList.remove("swipe-exit-left");
        nextAlbum();
        albumEl.classList.add("swipe-enter-right");
        albumEl.addEventListener("animationend", () => albumEl.classList.remove("swipe-enter-right"), { once: true });
      }, { once: true });

    } else if (currentDx > SWIPE_THRESHOLD) {
      albumEl.style.transition = "";
      albumEl.style.transform = "";
      albumEl.classList.add("swipe-exit-right");

      albumEl.addEventListener("animationend", () => {
        albumEl.classList.remove("swipe-exit-right");
        prevAlbum();
        albumEl.classList.add("swipe-enter-left");
        albumEl.addEventListener("animationend", () => albumEl.classList.remove("swipe-enter-left"), { once: true });
      }, { once: true });

    } else {
      resetTransform();
    }
  }, { passive: true });

  albumEl.addEventListener("touchcancel", () => {
    isDragging = false;
    resetTransform();
  }, { passive: true });
};

// ============================================================================
// UI Manager
// ============================================================================

const createUIManager = (state: AppState): UIManager => {
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
    coverContainer: document.querySelector(".cover-container"),
    errorOverlay: document.getElementById("error-overlay"),
    retryBtn: document.getElementById("retry-btn") as HTMLButtonElement | null,
    copyLinkFab: document.getElementById("copy-link-fab") as HTMLButtonElement | null,
  };

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
    () => window.appState?.getCurrentTag() || ""
  );

  const showAlbum = (album: Album | undefined) => {
    if (!album) {
      if (elements.loadingSpinner) elements.loadingSpinner.classList.add("hidden");
      if (elements.coverContainer) elements.coverContainer.classList.remove("loading");
      return;
    }

    if (elements.loadingSpinner) elements.loadingSpinner.classList.remove("hidden");
    if (elements.coverContainer) elements.coverContainer.classList.add("loading");

    const tempImg = new Image();
    tempImg.onload = () => {
      if (elements.cover) elements.cover.src = tempImg.src;
      if (elements.loadingSpinner) elements.loadingSpinner.classList.add("hidden");
      if (elements.coverContainer) elements.coverContainer.classList.remove("loading");
    };
    tempImg.src = album.img;

    if (elements.title) {
      elements.title.textContent = "";
      const span = document.createElement("span");
      span.className = "truncate-text";
      span.textContent = album.title;
      elements.title.appendChild(span);
      if (span.scrollWidth > span.clientWidth) {
        elements.title.setAttribute('data-tooltip', album.title);
      } else {
        elements.title.removeAttribute('data-tooltip');
      }
    }

    if (elements.artist) {
      const artistText = `by ${album.artist}`;
      elements.artist.textContent = "";
      const span = document.createElement("span");
      span.className = "truncate-text";
      span.textContent = artistText;
      elements.artist.appendChild(span);
      if (span.scrollWidth > span.clientWidth) {
        elements.artist.setAttribute('data-tooltip', album.artist);
      } else {
        elements.artist.removeAttribute('data-tooltip');
      }
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
      elements.trackInfo.textContent = "";
      elements.trackInfo.removeAttribute('data-tooltip');
      return;
    }

    const trackText = album.featured_track.title;
    elements.trackInfo.textContent = "";
    const span = document.createElement("span");
    span.className = "truncate-text";
    const strong = document.createElement("strong");
    strong.textContent = "Featured Track: ";
    span.appendChild(strong);
    span.appendChild(document.createTextNode(trackText));
    elements.trackInfo.appendChild(span);
    
    if (span.scrollWidth > span.clientWidth) {
      elements.trackInfo.setAttribute('data-tooltip', trackText);
    } else {
      elements.trackInfo.removeAttribute('data-tooltip');
    }
  };

  const updateLabelInfo = (album: Album) => {
    if (!elements.labelInfo) return;
    if (!album.band_name) {
      elements.labelInfo.textContent = "";
      elements.labelInfo.removeAttribute('data-tooltip');
      return;
    }
    
    elements.labelInfo.textContent = "";
    const span = document.createElement("span");
    span.className = "truncate-text";
    const strong = document.createElement("strong");
    strong.textContent = "Label: ";
    span.appendChild(strong);
    span.appendChild(document.createTextNode(album.band_name));
    elements.labelInfo.appendChild(span);
    
    if (span.scrollWidth > span.clientWidth) {
      elements.labelInfo.setAttribute('data-tooltip', album.band_name);
    } else {
      elements.labelInfo.removeAttribute('data-tooltip');
    }
  };

  const updateTrackCount = (album: Album) => {
    if (!elements.trackCount) return;
    elements.trackCount.textContent = "";
    if (album.track_count && album.track_count > 0) {
      const strong = document.createElement("strong");
      strong.textContent = "Track Count: ";
      elements.trackCount.appendChild(strong);
      elements.trackCount.appendChild(document.createTextNode(album.track_count.toString()));
    }
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
      elements.releaseDate.textContent = "";
      const strong = document.createElement("strong");
      strong.textContent = "Release Date: ";
      elements.releaseDate.appendChild(strong);
      elements.releaseDate.appendChild(document.createTextNode(formattedDate));
    } else {
      elements.releaseDate.textContent = "";
    }
  };

  const updateAudioPlayer = (album: Album) => {
    if (!elements.player) return;
    // Audio player is now managed by audio-controller module
  };

  const preloadNextImages = (count = 3) => {
    for (let i = 1; i <= count; i++) {
      const albums = state.getAlbums();
      const nextItem = albums[state.getCurrentIndex() + i];
      if (nextItem && nextItem.img) {
        const img = new Image();
        img.src = nextItem.img;
      }
    }
  };

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
    navigateDropdown: genreDropdownManager.navigate,
    getHighlightedGenre: genreDropdownManager.getHighlightedGenre,
  };
};

// ============================================================================
// App Controller (Thin Orchestration Layer)
// ============================================================================

export const createAppController = (): AppController => {
  const state = createAppState();
  const service = createAlbumService();
  const ui = createUIManager(state);

  // Initialize all module controllers
  const audioController = createAudioController();
  const keyboardController = createKeyboardController();
  const paginationController = createPaginationController(state);
  const urlStateManager = createURLStateManager();

  // Initialize audio on first use
  if (ui.elements.player) {
    audioController.initialize(ui.elements.player);
    audioController.onError(() => {
      if (ui.elements.trackInfo) {
        ui.elements.trackInfo.textContent = "Track unavailable";
        ui.elements.trackInfo.removeAttribute("data-tooltip");
      }
      ui.showToast("Track unavailable", "error");
    });
  }

  const fetchAlbums = async (page = 1) => {
    state.setIsFetching(true);
    ui.hideError();
    if (ui.elements.loadingSpinner) {
      ui.elements.loadingSpinner.classList.remove("hidden");
    }
    if (ui.elements.coverContainer) {
      ui.elements.coverContainer.classList.add("loading");
    }

    try {
      const { data, error } = await service.fetchAlbums(
        page,
        state.getCurrentMode(),
        state.getCurrentTag()
      );

      if (error) {
        if (error.type === 'network') {
          throw new Error("Network error. Please check your connection and try again.");
        } else if (error.type === 'timeout') {
          throw new Error("Request timed out. The server is taking too long to respond.");
        } else if (error.type === 'http' && error.status === 400) {
          throw new Error("Invalid request. Please try a different genre.");
        } else if (error.type === 'http' && error.status === 502) {
          throw new Error("Upstream service (Bandcamp) is temporarily unavailable.");
        } else {
          throw new Error(`Error loading albums: ${error.message}`);
        }
      }

      const validAlbums = (data || []).filter((album) => {
        if (!album.stream_url) {
          // eslint-disable-next-line no-console
          console.warn("Skipping album with missing stream URL:", album.title);
          return false;
        }
        return true;
      });

      state.addAlbums(validAlbums);
      state.setLastError(null);

      if (validAlbums.length === 0 && state.getAlbums().length === 0) {
        ui.showError(`No results found for "${state.getCurrentTag() || state.getCurrentMode()}". Try a different genre.`);
      }
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Error fetching albums:", error);
      const errMsg = error instanceof Error ? error.message : (typeof error === 'object' && error !== null && 'message' in error ? String((error as Record<string, unknown>)['message']) : 'Failed to load albums');
      state.setLastError(error instanceof Error ? error : new Error(errMsg));

      if (state.getAlbums().length === 0) {
        ui.showError("Failed to load albums. Please try again.");
      } else {
        ui.showToast("Failed to load more albums", "error");
      }
    } finally {
      state.setIsFetching(false);
    }
  };

  const showCurrentAlbum = async () => {
    const album = state.getCurrentAlbum();
    ui.showAlbum(album);
    
    if (album?.stream_url) {
      audioController.loadTrack(album.stream_url);
      await audioController.play();
    }
    paginationController.preloadNextImages();
  };

  const nextAlbum = async () => {
    await paginationController.nextAlbum(() => fetchAlbums(state.getCurrentPage()));
    await showCurrentAlbum();
  };

  const prevAlbum = async () => {
    paginationController.prevAlbum();
    await showCurrentAlbum();
  };

  const switchMode = async (mode: DiscoveryMode) => {
    if (mode === state.getCurrentMode()) return;

    state.setCurrentMode(mode);
    state.resetState();
    urlStateManager.updateUrl(state.getCurrentTag(), mode);
    applyGenreTheme(state.getCurrentTag(), mode);

    const isNew = mode === "new";
    if (ui.elements.newReleasesBtn) {
      ui.elements.newReleasesBtn.classList.toggle("active", isNew);
      ui.elements.newReleasesBtn.setAttribute("aria-pressed", isNew.toString());
    }
    if (ui.elements.hotBtn) {
      ui.elements.hotBtn.classList.toggle("active", !isNew);
      ui.elements.hotBtn.setAttribute("aria-pressed", (!isNew).toString());
    }

    const modeText = mode === "new" ? "new releases" : "hot releases";
    const modeToast = isTouchDevice()
      ? `Switching to ${modeText}…`
      : `Switching to ${modeText}...`;
    ui.showToast(modeToast, "success");

    await fetchAlbums(1);
    await showCurrentAlbum();
  };

  const selectGenre = async (genre: string) => {
    if (genre === state.getCurrentTag()) return;

    state.setCurrentTag(genre);
    state.resetState();
    urlStateManager.updateUrl(genre, state.getCurrentMode());
    applyGenreTheme(genre, state.getCurrentMode());
    ui.updateSearchInput(genre);
    ui.toggleDropdown(false);

    const genreText = genre || "all genres";
    const genreToast = isTouchDevice()
      ? `Loading ${genreText}…`
      : `Loading ${genreText}...`;
    ui.showToast(genreToast, "success");

    await fetchAlbums(1);
    await showCurrentAlbum();
  };

  const copyAlbumLink = async () => {
    const album = state.getCurrentAlbum();
    if (album?.link) {
      try {
        await navigator.clipboard.writeText(album.link);
        ui.showToast("Album link copied to clipboard!", "success");
      } catch (err) {
        // eslint-disable-next-line no-console
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
          url.protocol === "https:" &&
          (url.hostname === "bandcamp.com" ||
          url.hostname.endsWith(".bandcamp.com"))
        ) {
          window.open(album.link, "_blank");
          ui.showToast("Opening album page in new tab", "success");
        } else {
          ui.showToast("Invalid album URL", "error");
        }
      } catch {
        ui.showToast("Invalid album URL", "error");
      }
    }
  };

  const toggleAudio = () => {
    audioController.togglePlayPause();
  };

  const seekAudio = (seconds: number) => {
    audioController.seek(seconds);
  };

  const retryFetch = async () => {
    if (ui.elements.loadingSpinner) {
      ui.elements.loadingSpinner.classList.remove("hidden");
    }
    ui.hideError();
    await fetchAlbums(state.getCurrentPage());
    if (state.getAlbums().length > 0) {
      await showCurrentAlbum();
    }
  };

  const setupEventListeners = () => {
    // Button events
    ui.elements.nextBtn?.addEventListener("click", () => nextAlbum());
    ui.elements.prevBtn?.addEventListener("click", () => prevAlbum());
    ui.elements.helpBtn?.addEventListener("click", () => ui.openModal());
    ui.elements.closeModal?.addEventListener("click", () => ui.closeModal());
    ui.elements.retryBtn?.addEventListener("click", () => retryFetch());
    ui.elements.copyLinkFab?.addEventListener("click", () => copyAlbumLink());

    // Mode switching
    ui.elements.newReleasesBtn?.addEventListener("click", () => switchMode("new"));
    ui.elements.hotBtn?.addEventListener("click", () => switchMode("hot"));

    // Modal backdrop click to close
    ui.elements.helpModal?.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).id === "help-modal") {
        ui.closeModal();
      }
    });

    // Touch navigation
    setupTouchNavigation(nextAlbum, prevAlbum);

    // Setup keyboard shortcuts
    keyboardController.registerShortcut("e", () => nextAlbum());
    keyboardController.registerShortcut("q", () => prevAlbum());
    keyboardController.registerShortcut("w", () => copyAlbumLink());
    keyboardController.registerShortcut("s", () => openAlbumPage());
    keyboardController.registerShortcut(" ", () => toggleAudio(), { preventDefault: true });
    keyboardController.registerShortcut("arrowleft", () => seekAudio(-10), { preventDefault: true });
    keyboardController.registerShortcut("arrowright", () => seekAudio(10), { preventDefault: true });
    keyboardController.registerShortcut("arrowup", () => audioController.adjustVolume(0.1), { preventDefault: true });
    keyboardController.registerShortcut("arrowdown", () => audioController.adjustVolume(-0.1), { preventDefault: true });
    keyboardController.registerShortcut("escape", () => {
      ui.closeModal();
      ui.toggleDropdown(false);
    });
    keyboardController.registerShortcut("/", () => {
      if (ui.elements.genreSearch) {
        ui.elements.genreSearch.focus();
      }
    }, { preventDefault: true });
    keyboardController.setupListener();

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
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          ui.navigateDropdown('down');
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          ui.navigateDropdown('up');
        } else if (e.key === "Enter") {
          e.preventDefault();
          const highlightedGenre = ui.getHighlightedGenre();
          if (highlightedGenre !== null) {
            selectGenre(highlightedGenre);
          } else if (searchInput.value) {
            selectGenre(searchInput.value);
          }
        }
      });

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

      dropdown.addEventListener("click", (e) => {
        const item = (e.target as HTMLElement).closest(".genre-item") as HTMLElement;
        if (item && item.dataset['genre'] !== undefined) {
          selectGenre(item.dataset['genre']);
        }
      });
    }
  };

  const init = async () => {
    const { genre, mode } = urlStateManager.parseUrlParams();

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

    applyGenreTheme(genre, state.getCurrentMode());

    await fetchAlbums(state.getCurrentPage());
    await showCurrentAlbum();
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
    seekAudio,
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

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (window.appController?.ui) {
      window.appController.ui.showToast(`An error occurred: ${event.message}`, 'error');
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (window.appController?.ui) {
      window.appController.ui.showToast(`An error occurred: ${event.reason?.message || 'Unknown promise rejection'}`, 'error');
    }
  });

  window.appState = null;
  window.appController = null;
}

if (typeof document !== 'undefined') {
  document.addEventListener("DOMContentLoaded", () => {
    const controller = createAppController();
    window.appController = controller;
    window.appState = controller.state;
    controller.setupEventListeners();
    controller.init();
  });
}
