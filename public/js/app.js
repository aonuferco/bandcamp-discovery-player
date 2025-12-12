import { GENRES, ALL_GENRES } from "./genres.js";
import { createAppState } from "./state.js";
import { createAlbumService } from "./api.js";

// UI manager
const createUIManager = () => {
  const elements = {
    cover: document.getElementById("cover"),
    title: document.getElementById("title"),
    artist: document.getElementById("artist"),
    trackInfo: document.getElementById("track-info"),
    labelInfo: document.getElementById("label-info"),
    trackCount: document.getElementById("track-count"),
    releaseDate: document.getElementById("release-date"),
    player: document.getElementById("player"),
    nextBtn: document.getElementById("next-btn"),
    prevBtn: document.getElementById("prev-btn"),
    helpBtn: document.getElementById("help-btn"),
    helpModal: document.getElementById("help-modal"),
    closeModal: document.getElementById("close-modal"),
    toastContainer: document.getElementById("toast-container"),
    newReleasesBtn: document.getElementById("new-releases-btn"),
    hotBtn: document.getElementById("hot-btn"),
    genreSearch: document.getElementById("genre-search"),
    genreDropdown: document.getElementById("genre-dropdown"),
    loadingSpinner: document.getElementById("loading-spinner"),
  };

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

  const updateLabelInfo = (album) => {
    if (album.band_name) {
      elements.labelInfo.innerHTML = `<strong>Label:</strong> ${album.band_name}`;
    } else {
      elements.labelInfo.innerHTML = "";
    }
  };

  const updateTrackCount = (album) => {
    if (album.track_count > 0) {
      elements.trackCount.innerHTML = `<strong>Track Count:</strong> ${album.track_count}`;
    } else {
      elements.trackCount.innerHTML = "";
    }
  };

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

  const showToast = (message, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${message}</span>
      </div>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  };

  // Track previously focused element for modal focus management
  let previouslyFocusedElement = null;

  const openModal = () => {
    // Store the currently focused element to restore later
    previouslyFocusedElement = document.activeElement;
    
    elements.helpModal.classList.add("show");
    elements.helpModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    
    // Move focus to the close button
    elements.closeModal.focus();
    
    // Add focus trap event listener
    elements.helpModal.addEventListener("keydown", trapFocus);
  };

  const closeModal = () => {
    elements.helpModal.classList.remove("show");
    elements.helpModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "auto";
    
    // Remove focus trap event listener
    elements.helpModal.removeEventListener("keydown", trapFocus);
    
    // Restore focus to the previously focused element
    if (previouslyFocusedElement) {
      previouslyFocusedElement.focus();
      previouslyFocusedElement = null;
    }
  };

  const trapFocus = (e) => {
    if (e.key !== "Tab") return;
    
    // Get all focusable elements within the modal
    const focusableElements = elements.helpModal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.shiftKey) {
      // Shift + Tab: if on first element, move to last
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: if on last element, move to first
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  const renderGenreDropdown = (filter = "") => {
    const dropdown = elements.genreDropdown;
    dropdown.innerHTML = "";

    const filterLower = filter.toLowerCase();
    let hasResults = false;

    // Helper to create genre item
    const createItem = (genre) => {
      const div = document.createElement("div");
      div.className = "genre-item";
      if (genre === window.appState.getCurrentTag()) {
        div.classList.add("selected");
      }
      div.textContent = genre;
      div.dataset.genre = genre;
      return div;
    };

    // If filtering, show flat list
    if (filter) {
      const matches = ALL_GENRES.filter((g) =>
        g.toLowerCase().includes(filterLower)
      );

      if (matches.length > 0) {
        matches.forEach((genre) => {
          dropdown.appendChild(createItem(genre));
        });
        hasResults = true;
      } else {
        const noRes = document.createElement("div");
        noRes.className = "genre-item no-results";
        noRes.textContent = "No genres found";
        dropdown.appendChild(noRes);
      }
    } else {
      // Show grouped list
      Object.entries(GENRES).forEach(([category, genres]) => {
        const groupDiv = document.createElement("div");
        groupDiv.className = "genre-group";

        const title = document.createElement("div");
        title.className = "genre-group-title";
        title.textContent = category;
        groupDiv.appendChild(title);

        genres.forEach((genre) => {
          groupDiv.appendChild(createItem(genre));
        });

        dropdown.appendChild(groupDiv);
      });
      hasResults = true;
    }

    return hasResults;
  };

  const toggleDropdown = (show) => {
    if (show) {
      elements.genreDropdown.classList.add("show");
    } else {
      elements.genreDropdown.classList.remove("show");
    }
    // Update aria-expanded on the combobox input
    elements.genreSearch.setAttribute("aria-expanded", show.toString());
  };

  const updateSearchInput = (tag) => {
    elements.genreSearch.value = tag;
  };

  return {
    elements,
    showAlbum,
    updateTrackInfo,
    updateLabelInfo,
    updateTrackCount,
    updateAudioPlayer,
    preloadNextImages,
    showToast,
    openModal,
    closeModal,
    renderGenreDropdown,
    toggleDropdown,
    updateSearchInput,
  };
};

// Main app controller
const createAppController = () => {
  const state = createAppState();
  const service = createAlbumService();
  const ui = createUIManager();

  const fetchAlbums = async (page = 1) => {
    state.setIsFetching(true);
    try {
      const data = await service.fetchAlbums(
        page,
        state.getCurrentMode(),
        state.getCurrentTag()
      );
      state.addAlbums(data);
    } catch (error) {
      console.error("Error fetching albums:", error);
      ui.showToast("Failed to load albums", "error");
    } finally {
      state.setIsFetching(false);
    }
  };

  const switchMode = async (mode) => {
    if (mode === state.getCurrentMode()) return;

    state.setCurrentMode(mode);
    state.resetState();

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
    }
  };

  const setupEventListeners = () => {
    // Button events
    ui.elements.nextBtn.addEventListener("click", () => nextAlbum());
    ui.elements.prevBtn.addEventListener("click", () => prevAlbum());
    ui.elements.helpBtn.addEventListener("click", () => ui.openModal());
    ui.elements.closeModal.addEventListener("click", () => ui.closeModal());

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
    await fetchAlbums(state.getCurrentPage());
    showCurrentAlbum();
  };

  return {
    state,
    service,
    ui,
    fetchAlbums,
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
