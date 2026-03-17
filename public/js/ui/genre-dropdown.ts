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
  navigate(direction: 'up' | 'down'): void;
  getHighlightedGenre(): string | null;
  resetHighlight(): void;
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
  let highlightedIndex = -1;

  const getItems = (): HTMLElement[] => {
    if (!genreDropdown) return [];
    return Array.from(genreDropdown.querySelectorAll(".genre-item:not(.no-results)")) as HTMLElement[];
  };

  const applyHighlight = (items: HTMLElement[]) => {
    items.forEach((item, index) => {
      if (index === highlightedIndex) {
        item.classList.add("highlighted");
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else {
        item.classList.remove("highlighted");
      }
    });
  };

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
      div.dataset['genre'] = genre;
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

    highlightedIndex = -1;
    return hasResults;
  };

  /**
   * Reset the highlighted index
   */
  const resetHighlight = () => {
    highlightedIndex = -1;
    const items = getItems();
    items.forEach(item => item.classList.remove("highlighted"));
  };

  /**
   * Navigate through the dropdown items
   * @param direction
   */
  const navigate = (direction: 'up' | 'down') => {
    const items = getItems();
    if (items.length === 0) return;

    if (direction === 'down') {
      highlightedIndex++;
      if (highlightedIndex >= items.length) highlightedIndex = 0;
    } else {
      highlightedIndex--;
      if (highlightedIndex < 0) highlightedIndex = items.length - 1;
    }

    applyHighlight(items);
  };

  /**
   * Get the genre string of the currently highlighted item
   * @returns genre or null
   */
  const getHighlightedGenre = (): string | null => {
    const items = getItems();
    if (highlightedIndex >= 0 && highlightedIndex < items.length) {
      return (items[highlightedIndex] as HTMLElement).dataset['genre'] || null;
    }
    return null;
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
    navigate,
    getHighlightedGenre,
    resetHighlight,
  };
};
