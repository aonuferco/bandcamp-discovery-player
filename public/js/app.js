import { ALL_GENRES } from "./genres";
import { createAppState } from "./state";
import { createAlbumService } from "./api";
import { createModalManager } from "./ui/modal.js";
import { createToastManager } from "./ui/toast.js";
import { createGenreDropdownManager } from "./ui/genre-dropdown.js";

// ============================================================================
// JSDoc Type Definitions
// ============================================================================

/**
 * @typedef {"new" | "hot"} DiscoveryMode
 */

/**
 * @typedef {"success" | "error"} ToastType
 */

/**
 * @typedef {Object} FeaturedTrack
 * @property {string} title
 * @property {number} [duration]
 */

/**
 * @typedef {Object} Album
 * @property {string} title
 * @property {string} artist
 * @property {string} img
 * @property {string} link
 * @property {string} stream_url
 * @property {FeaturedTrack} [featured_track]
 * @property {string} [band_name]
 * @property {number} [track_count]
 * @property {string} [release_date]
 */

/**
 * @typedef {Object} AppState
 * @property {(newAlbums: Album[]) => void} addAlbums
 * @property {() => Album | undefined} getCurrentAlbum
 * @property {() => boolean} canGoNext
 * @property {() => boolean} canGoPrev
 * @property {() => boolean} needsMoreData
 * @property {() => Album[]} getAlbums
 * @property {() => number} getCurrentIndex
 * @property {() => number} getCurrentPage
 * @property {() => boolean} getIsFetching
 * @property {() => DiscoveryMode} getCurrentMode
 * @property {() => string} getCurrentTag
 * @property {() => string | null} getLastError
 * @property {(index: number) => void} setCurrentIndex
 * @property {(page: number) => void} setCurrentPage
 * @property {(fetching: boolean) => void} setIsFetching
 * @property {(mode: DiscoveryMode) => void} setCurrentMode
 * @property {(tag: string) => void} setCurrentTag
 * @property {(error: string | null) => void} setLastError
 * @property {() => void} incrementCurrentIndex
 * @property {() => void} decrementCurrentIndex
 * @property {() => void} incrementCurrentPage
 * @property {() => void} resetState
 */

/**
 * @typedef {Object} AlbumService
 * @property {(page?: number, mode?: DiscoveryMode, tag?: string) => Promise<Album[]>} fetchAlbums
 */

/**
 * @typedef {Object} UIElements
 * @property {HTMLImageElement | null} cover
 * @property {HTMLElement | null} title
 * @property {HTMLElement | null} artist
 * @property {HTMLElement | null} trackInfo
 * @property {HTMLElement | null} labelInfo
 * @property {HTMLElement | null} trackCount
 * @property {HTMLElement | null} releaseDate
 * @property {HTMLElement | null} player
 * @property {HTMLButtonElement | null} nextBtn
 * @property {HTMLButtonElement | null} prevBtn
 * @property {HTMLButtonElement | null} helpBtn
 * @property {HTMLElement | null} helpModal
 * @property {HTMLButtonElement | null} closeModal
 * @property {HTMLElement | null} toastContainer
 * @property {HTMLButtonElement | null} newReleasesBtn
 * @property {HTMLButtonElement | null} hotBtn
 * @property {HTMLInputElement | null} genreSearch
 * @property {HTMLElement | null} genreDropdown
 * @property {HTMLElement | null} loadingSpinner
 * @property {HTMLElement | null} errorOverlay
 * @property {HTMLButtonElement | null} retryBtn
 */

/**
 * @typedef {Object} UIManager
 * @property {UIElements} elements
 * @property {(album: Album | undefined) => void} showAlbum
 * @property {(album: Album) => void} updateTrackInfo
 * @property {(album: Album) => void} updateLabelInfo
 * @property {(album: Album) => void} updateTrackCount
 * @property {(album: Album) => void} updateAudioPlayer
 * @property {(count?: number) => void} preloadNextImages
 * @property {(message: string, type?: ToastType) => void} showToast
 * @property {(message?: string) => void} showError
 * @property {() => void} hideError
 * @property {() => void} openModal
 * @property {() => void} closeModal
 * @property {(filter?: string) => boolean} renderGenreDropdown
 * @property {(show: boolean) => void} toggleDropdown
 * @property {(tag: string) => void} updateSearchInput
 */

/**
 * @typedef {Object} AppController
 * @property {AppState} state
 * @property {AlbumService} service
 * @property {UIManager} ui
 * @property {(page?: number) => Promise<void>} fetchAlbums
 * @property {() => Promise<void>} retryFetch
 * @property {() => void} showCurrentAlbum
 * @property {() => Promise<void>} nextAlbum
 * @property {() => void} prevAlbum
 * @property {() => Promise<void>} copyAlbumLink
 * @property {() => void} toggleAudio
 * @property {(mode: DiscoveryMode) => Promise<void>} switchMode
 * @property {() => void} setupEventListeners
 * @property {() => Promise<void>} init
 */

// Extend the Window interface for global app state
/**
 * @global
 * @type {AppState | null}
 */
let appStateGlobal;

/**
 * @global
 * @type {AppController | null}
 */
let appControllerGlobal;

// ============================================================================
// URL Utilities for shareable links
// ============================================================================

/**
 * Validates if a genre is in the list of known genres
 * @param {string | null | undefined} genre - The genre to validate
 * @returns {boolean}
 */
const isValidGenre = (genre) => genre && ALL_GENRES.includes(genre);

/**
 * Validates if a mode is either "new" or "hot"
 * @param {string | null | undefined} mode - The mode to validate
 * @returns {mode is DiscoveryMode}
 */
const isValidMode = (mode) => mode === "new" || mode === "hot";

/**
 * Parse URL parameters for genre and mode
 * @returns {{ genre: string, mode: DiscoveryMode }}
 */
const parseUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  const genre = params.get("genre") || "";
  const mode = params.get("mode") || "new";
  return {
    genre: isValidGenre(genre) ? genre : "",
    mode: isValidMode(mode) ? mode : "new",
  };
};

/**
 * Update the URL with genre and mode parameters
 * @param {string} genre - The genre tag to set
 * @param {DiscoveryMode} mode - The discovery mode
 * @returns {void}
 */
const updateUrl = (genre, mode) => {
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
// UI Manager
// ============================================================================

/**
 * Creates the UI manager for handling DOM updates and user interface
 * @returns {UIManager}
 */
const createUIManager = () => {
  /** @type {UIElements} */
  const elements = {
    cover: /** @type {HTMLImageElement | null} */ (document.getElementById("cover")),
    title: document.getElementById("title"),
    artist: document.getElementById("artist"),
    trackInfo: document.getElementById("track-info"),
    labelInfo: document.getElementById("label-info"),
    trackCount: document.getElementById("track-count"),
    releaseDate: document.getElementById("release-date"),
    player: document.getElementById("player"),
    nextBtn: /** @type {HTMLButtonElement | null} */ (document.getElementById("next-btn")),
    prevBtn: /** @type {HTMLButtonElement | null} */ (document.getElementById("prev-btn")),
    helpBtn: /** @type {HTMLButtonElement | null} */ (document.getElementById("help-btn")),
    helpModal: document.getElementById("help-modal"),
    closeModal: /** @type {HTMLButtonElement | null} */ (document.getElementById("close-modal")),
    toastContainer: document.getElementById("toast-container"),
    newReleasesBtn: /** @type {HTMLButtonElement | null} */ (document.getElementById("new-releases-btn")),
    hotBtn: /** @type {HTMLButtonElement | null} */ (document.getElementById("hot-btn")),
    genreSearch: /** @type {HTMLInputElement | null} */ (document.getElementById("genre-search")),
    genreDropdown: document.getElementById("genre-dropdown"),
    loadingSpinner: document.getElementById("loading-spinner"),
    errorOverlay: document.getElementById("error-overlay"),
    retryBtn: /** @type {HTMLButtonElement | null} */ (document.getElementById("retry-btn")),
  };

  /**
   * Display an album in the UI
   * @param {Album | undefined} album - The album to display
   * @returns {void}
   */
  const showAlbum = (album) => {
    if (!album) return;

    // Show loading spinner
    elements.loadingSpinner.classList.remove("hidden");

    // Load image asynchronously
    const tempImg = new Image();
    tempImg.onload = () => {
      elements.cover.src = tempImg.src;
      elements.loadingSpinner.classList.add("hidden");
    };
    tempImg.src = album.img;

    // Update text content
    elements.title.textContent = album.title;
    elements.title.title = album.title;
    elements.artist.textContent = `by ${album.artist}`;

    updateTrackInfo(album);

    updateLabelInfo(album);

    updateTrackCount(album);

    updateReleaseDate(album);

    updateAudioPlayer(album);
  };

  /**
   * Update the featured track info display
   * @param {Album} album - The album data
   * @returns {void}
   */
  const updateTrackInfo = (album) => {
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

  /**
   * Update the label info display
   * @param {Album} album - The album data
   * @returns {void}
   */
  const updateLabelInfo = (album) => {
    if (album.band_name) {
      elements.labelInfo.innerHTML = `<strong>Label:</strong> ${album.band_name}`;
    } else {
      elements.labelInfo.innerHTML = "";
    }
  };

  /**
   * Update the track count display
   * @param {Album} album - The album data
   * @returns {void}
   */
  const updateTrackCount = (album) => {
    if (album.track_count > 0) {
      elements.trackCount.innerHTML = `<strong>Track Count:</strong> ${album.track_count}`;
    } else {
      elements.trackCount.innerHTML = "";
    }
  };

  /**
   * Update the release date display
   * @param {Album} album - The album data
   * @returns {void}
   */
  const updateReleaseDate = (album) => {
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

  const getSavedVolume = () => {
    const saved = localStorage.getItem("bandcamp-volume");
    return saved ? parseFloat(saved) : 0.2;
  };

  const saveVolume = (volume) => {
    localStorage.setItem("bandcamp-volume", volume.toString());
  };

  const updateAudioPlayer = (album) => {
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
    for (let i = 1; i <= count; i++) {
      const nextItem =
        window.appState.getAlbums()[window.appState.getCurrentIndex() + i];
      if (nextItem?.img) {
        const img = new Image();
        img.src = nextItem.img;
      }
    }
  };

  // Create sub-managers for modal, toast, and genre dropdown
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

  return {
    elements,
    showAlbum,
    updateTrackInfo,
    updateLabelInfo,
    updateTrackCount,
    updateAudioPlayer,
    preloadNextImages,
    // Delegate to sub-managers
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

// Main app controller
const createAppController = () => {
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
    } catch (error) {
      console.error("Error fetching albums:", error);
      state.setLastError(error.message || "Failed to load albums");
      
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
    ui.elements.loadingSpinner.classList.remove("hidden");
    ui.hideError();
    await fetchAlbums(state.getCurrentPage(), true);
    if (state.getAlbums().length > 0) {
      showCurrentAlbum();
    }
  };

  const switchMode = async (mode) => {
    if (mode === state.getCurrentMode()) return;

    state.setCurrentMode(mode);
    state.resetState();
    updateUrl(state.getCurrentTag(), mode);

    // Update button states and aria-pressed
    const isNew = mode === "new";
    ui.elements.newReleasesBtn.classList.toggle("active", isNew);
    ui.elements.hotBtn.classList.toggle("active", !isNew);
    ui.elements.newReleasesBtn.setAttribute("aria-pressed", isNew.toString());
    ui.elements.hotBtn.setAttribute("aria-pressed", (!isNew).toString());

    // Show loading state
    const modeText = mode === "new" ? "new releases" : "hot releases";
    ui.showToast(`Switching to ${modeText}...`, "success");

    // Fetch new data
    await fetchAlbums(1);
    showCurrentAlbum();
  };

  const selectGenre = async (genre) => {
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
      // Validate that the URL is a legitimate Bandcamp URL
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

  const seekAudio = (seconds) => {
    const audio = document.querySelector("audio");
    if (audio) {
      const newTime = audio.currentTime + seconds;
      audio.currentTime = Math.max(0, Math.min(newTime, audio.duration));
    }
  };

  const adjustVolume = (change) => {
    const audio = document.querySelector("audio");
    if (audio) {
      const newVolume = Math.max(0, Math.min(1, audio.volume + change));
      audio.volume = newVolume;
    }
  };

  const handleKeydown = (e) => {
    const tag = e.target.tagName.toLowerCase();
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
        ui.elements.genreSearch.focus();
        break;
    }
  };

  const setupEventListeners = () => {
    // Button events
    ui.elements.nextBtn.addEventListener("click", () => nextAlbum());
    ui.elements.prevBtn.addEventListener("click", () => prevAlbum());
    ui.elements.helpBtn.addEventListener("click", () => ui.openModal());
    ui.elements.closeModal.addEventListener("click", () => ui.closeModal());
    
    // Retry button for error recovery
    ui.elements.retryBtn.addEventListener("click", () => retryFetch());

    // Mode button events
    ui.elements.newReleasesBtn.addEventListener("click", () =>
      switchMode("new")
    );
    ui.elements.hotBtn.addEventListener("click", () => switchMode("hot"));

    // Modal events
    ui.elements.helpModal.addEventListener("click", (e) => {
      if (e.target.id === "help-modal") {
        ui.closeModal();
      }
    });

    // Keyboard events
    document.addEventListener("keydown", (e) => handleKeydown(e));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        ui.closeModal();
      }
    });

    // Search dropdown events
    const searchInput = ui.elements.genreSearch;
    const dropdown = ui.elements.genreDropdown;

    searchInput.addEventListener("focus", () => {
      ui.renderGenreDropdown(searchInput.value);
      ui.toggleDropdown(true);
    });

    searchInput.addEventListener("input", (e) => {
      ui.renderGenreDropdown(e.target.value);
      ui.toggleDropdown(true);
    });

    // Escape to close dropdown and unfocus search
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        ui.toggleDropdown(false);
        // Reset input to current tag
        searchInput.value = state.getCurrentTag();
        searchInput.blur();
      }
    });

    // Click outside to close dropdown
    document.addEventListener("click", (e) => {
      if (
        !searchInput.contains(e.target) &&
        !dropdown.contains(e.target)
      ) {
        ui.toggleDropdown(false);
        // Reset input to current tag if user didn't select anything
        if (searchInput.value !== state.getCurrentTag()) {
          searchInput.value = state.getCurrentTag();
        }
      }
    });

    // Genre selection
    dropdown.addEventListener("click", (e) => {
      const item = e.target.closest(".genre-item");
      if (item && item.dataset.genre) {
        selectGenre(item.dataset.genre);
      }
    });
  };

  const init = async () => {
    // Apply URL params before first fetch
    const { genre, mode } = parseUrlParams();
    
    if (mode !== "new") {
      state.setCurrentMode(mode);
      ui.elements.newReleasesBtn.classList.remove("active");
      ui.elements.hotBtn.classList.add("active");
      ui.elements.newReleasesBtn.setAttribute("aria-pressed", "false");
      ui.elements.hotBtn.setAttribute("aria-pressed", "true");
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
    toggleAudio,
    switchMode,
    setupEventListeners,
    init,
  };
};

// Initialize app
window.appState = null;
window.appController = null;

document.addEventListener("DOMContentLoaded", () => {
  window.appController = createAppController();
  window.appState = window.appController.state;
  window.appController.setupEventListeners();
  window.appController.init();
});
