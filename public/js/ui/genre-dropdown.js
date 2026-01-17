import { GENRES, ALL_GENRES } from "../genres.js";

/**
 * @typedef {Object} GenreDropdownElements
 * @property {HTMLInputElement | null} genreSearch
 * @property {HTMLElement | null} genreDropdown
 */

/**
 * @typedef {Object} GenreDropdownManager
 * @property {(filter?: string) => boolean} renderGenreDropdown
 * @property {(show: boolean) => void} toggleDropdown
 * @property {(tag: string) => void} updateSearchInput
 */

/**
 * Creates the genre dropdown manager for handling genre selection
 * @param {GenreDropdownElements} elements - DOM elements for dropdown
 * @param {() => string} getCurrentTag - Callback to get current tag from state
 * @returns {GenreDropdownManager}
 */
export const createGenreDropdownManager = (elements, getCurrentTag) => {
  const { genreSearch, genreDropdown } = elements;

  /**
   * Render the genre dropdown with optional filtering
   * @param {string} filter - Filter string for searching genres
   * @returns {boolean} - Whether any results were found
   */
  const renderGenreDropdown = (filter = "") => {
    genreDropdown.innerHTML = "";

    const filterLower = filter.toLowerCase();
    let hasResults = false;

    /**
     * Helper to create a genre item element
     * @param {string} genre
     * @returns {HTMLDivElement}
     */
    const createItem = (genre) => {
      const div = document.createElement("div");
      div.className = "genre-item";
      if (genre === getCurrentTag()) {
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
          genreDropdown.appendChild(createItem(genre));
        });
        hasResults = true;
      } else {
        const noRes = document.createElement("div");
        noRes.className = "genre-item no-results";
        noRes.textContent = "No genres found";
        genreDropdown.appendChild(noRes);
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

        genreDropdown.appendChild(groupDiv);
      });
      hasResults = true;
    }

    return hasResults;
  };

  /**
   * Toggle dropdown visibility
   * @param {boolean} show - Whether to show the dropdown
   */
  const toggleDropdown = (show) => {
    if (show) {
      genreDropdown.classList.add("show");
    } else {
      genreDropdown.classList.remove("show");
    }
    // Update aria-expanded on the combobox input
    genreSearch.setAttribute("aria-expanded", show.toString());
  };

  /**
   * Update the search input value
   * @param {string} tag - The tag value to set
   */
  const updateSearchInput = (tag) => {
    genreSearch.value = tag;
  };

  return {
    renderGenreDropdown,
    toggleDropdown,
    updateSearchInput,
  };
};
