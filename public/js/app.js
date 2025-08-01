// App state management
const createAppState = () => {
  let albums = [];
  let currentIndex = 0;
  let currentPage = 1;
  let preloadThreshold = 3;
  let isFetching = false;
  let seenLinks = new Set();
  let currentMode = "new"; // "new" or "hot"

  return {
    addAlbums: (newAlbums) => {
      const filteredAlbums = newAlbums.filter((album) => {
        if (seenLinks.has(album.link)) return false;
        seenLinks.add(album.link);
        return true;
      });
      albums.push(...filteredAlbums);
    },

    getCurrentAlbum: () => albums[currentIndex],

    canGoNext: () => currentIndex < albums.length - 1,

    canGoPrev: () => currentIndex > 0,

    needsMoreData: () => albums.length - currentIndex <= preloadThreshold,

    // Getters and setters for state
    getAlbums: () => albums,
    getCurrentIndex: () => currentIndex,
    getCurrentPage: () => currentPage,
    getIsFetching: () => isFetching,
    getCurrentMode: () => currentMode,

    setCurrentIndex: (index) => {
      currentIndex = index;
    },
    setCurrentPage: (page) => {
      currentPage = page;
    },
    setIsFetching: (fetching) => {
      isFetching = fetching;
    },
    setCurrentMode: (mode) => {
      currentMode = mode;
    },
    incrementCurrentIndex: () => {
      currentIndex++;
    },
    decrementCurrentIndex: () => {
      currentIndex--;
    },
    incrementCurrentPage: () => {
      currentPage++;
    },
    resetState: () => {
      albums = [];
      currentIndex = 0;
      currentPage = 1;
      seenLinks = new Set();
    },
  };
};

// API service
const createAlbumService = () => {
  const fetchAlbums = async (page = 1, mode = "new") => {
    const response = await fetch(`/api/albums?page=${page}&slice=${mode}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  };

  return { fetchAlbums };
};

// UI manager
const createUIManager = () => {
  const elements = {
    cover: document.getElementById("cover"),
    title: document.getElementById("title"),
    artist: document.getElementById("artist"),
    trackInfo: document.getElementById("track-info"),
    labelInfo: document.getElementById("label-info"),
    trackCount: document.getElementById("track-count"),
    player: document.getElementById("player"),
    nextBtn: document.getElementById("next-btn"),
    prevBtn: document.getElementById("prev-btn"),
    helpBtn: document.getElementById("help-btn"),
    helpModal: document.getElementById("help-modal"),
    closeModal: document.getElementById("close-modal"),
    toastContainer: document.getElementById("toast-container"),
    newReleasesBtn: document.getElementById("new-releases-btn"),
    hotBtn: document.getElementById("hot-btn"),
  };

  const showAlbum = (album) => {
    if (!album) return;

    // Show loading state
    elements.cover.src = "./loading.gif";

    // Load image asynchronously
    const tempImg = new Image();
    tempImg.onload = () => {
      elements.cover.src = tempImg.src;
    };
    tempImg.src = album.img;

    // Update text content
    elements.title.textContent = album.title;
    elements.title.title = album.title;
    elements.artist.textContent = `by ${album.artist}`;

    updateTrackInfo(album);

    updateLabelInfo(album);

    updateTrackCount(album);

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

  const openModal = () => {
    elements.helpModal.classList.add("show");
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    elements.helpModal.classList.remove("show");
    document.body.style.overflow = "auto";
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
      const data = await service.fetchAlbums(page, state.getCurrentMode());
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

    // Update button states
    ui.elements.newReleasesBtn.classList.toggle("active", mode === "new");
    ui.elements.hotBtn.classList.toggle("active", mode === "hot");

    // Show loading state
    const modeText = mode === "new" ? "new releases" : "hot releases";
    ui.showToast(`Switching to ${modeText}...`, "success");

    // Fetch new data
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
