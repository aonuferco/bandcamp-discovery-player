export const createAppState = () => {
  let albums = [];
  let currentIndex = 0;
  let currentPage = 1;
  let preloadThreshold = 3;
  let isFetching = false;
  let seenLinks = new Set();
  let currentMode = "new"; // "new" or "hot"
  let currentTag = ""; // empty string means "all" / "discover"
  let lastError = null; // track last error for recovery UI

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
    getCurrentTag: () => currentTag,
    getLastError: () => lastError,

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
    setCurrentTag: (tag) => {
      currentTag = tag;
    },
    setLastError: (error) => {
      lastError = error;
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
      lastError = null;
    },
  };
};
