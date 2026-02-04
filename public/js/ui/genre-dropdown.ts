import { GENRES, ALL_GENRES } from "../genres";
import type { Genre } from "../genres";

export interface GenreDropdownElements {
  genreSearch: HTMLInputElement | null;
  genreDropdown: HTMLElement | null;
}

export interface GenreDropdownManager {
  renderGenreDropdown(filter?: string): boolean;
  toggleDropdown(show: boolean): void;
  updateSearchInput(tag: string): void;
}

/**
 * Creates the genre dropdown manager for handling genre selection
 * @param elements - DOM elements for dropdown
 * @param getCurrentTag - Callback to get current tag from state
 * @returns GenreDropdownManager
 */
export const createGenreDropdownManager = (
  elements: GenreDropdownElements,
  getCurrentTag: () => string
): GenreDropdownManager => {
  const { genreSearch, genreDropdown } = elements;

  /**
   * Render the genre dropdown with optional filtering
   * @param filter - Filter string for searching genres
   * @returns Whether any results were found
   */
  const renderGenreDropdown = (filter: string = ""): boolean => {
    if (!genreDropdown) return false;
    
    genreDropdown.innerHTML = "";

    const filterLower = filter.toLowerCase();
    let hasResults = false;

    /**
     * Helper to create a genre item element
     * @param genre
     * @returns HTMLDivElement
     */
    const createItem = (genre: string): HTMLDivElement => {
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
   * @param show - Whether to show the dropdown
   */
  const toggleDropdown = (show: boolean) => {
    if (!genreDropdown || !genreSearch) return;

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
   * @param tag - The tag value to set
   */
  const updateSearchInput = (tag: string) => {
    if (genreSearch) {
      genreSearch.value = tag;
    }
  };

  return {
    renderGenreDropdown,
    toggleDropdown,
    updateSearchInput,
  };
};
