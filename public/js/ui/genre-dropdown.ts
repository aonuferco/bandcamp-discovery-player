import { GENRES, ALL_GENRES } from "../genres";

export interface GenreDropdownElements {
  genreSearch: HTMLInputElement | null;
  genreDropdown: HTMLElement | null;
}

export interface GenreDropdownManager {
  renderGenreDropdown(filter?: string): boolean;
  toggleDropdown(show: boolean): void;
  updateSearchInput(tag: string): void;
  navigate(direction: "up" | "down"): void;
  getHighlightedGenre(): string | null;
  resetHighlight(): void;
}

/** Lowercase and strip hyphens/spaces/punctuation so "indie rock" matches "indie-rock" */
export const normalizeSearchValue = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const editDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const row: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = current;
    }
  }
  return row[b.length];
};

/**
 * Higher is better. 'null' means "not a match".
 * Prefix/substring beat one-chracter typos so "pop" still ranks above a near-miss.
 */
export const fuzzyScore = (query: string, genre: string): number | null => {
  const q = normalizeSearchValue(query);
  const g = normalizeSearchValue(genre);
  if (q.length === 0) return null;
  if (g === q) return 100;
  if (g.startsWith(q)) return 90;
  if (g.includes(q)) return 60;
  if (
    q.length >= 3 &&
    Math.abs(q.length - g.length) <= 1 &&
    editDistance(q, g) <= 1
  )
    return 25;
  return null;
};

export const findMatchingGenres = (filter: string): string[] => {
  const scored = ALL_GENRES.map((genre) => {
    const score = fuzzyScore(filter, genre);
    return score === null ? null : { genre, score };
  }).filter(
    (row): row is { genre: (typeof ALL_GENRES)[number]; score: number } =>
      row !== null,
  );

  scored.sort((a, b) => b.score - a.score || a.genre.localeCompare(b.genre));
  return scored.map((row) => row.genre);
};

/**
 * Creates the genre dropdown manager for handling genre selection
 * @param elements - DOM elements for dropdown
 * @param getCurrentTag - Callback to get current tag from state
 * @returns GenreDropdownManager
 */
export const createGenreDropdownManager = (
  elements: GenreDropdownElements,
  getCurrentTag: () => string,
): GenreDropdownManager => {
  const { genreSearch, genreDropdown } = elements;
  let highlightedIndex = -1;

  const getItems = (): HTMLElement[] => {
    if (!genreDropdown) return [];
    return Array.from(
      genreDropdown.querySelectorAll(".genre-item:not(.no-results)"),
    ) as HTMLElement[];
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

    genreDropdown.textContent = "";

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
      div.dataset["genre"] = genre;
      return div;
    };

    /**
     * Always prepend the "All Genres" sentinel item at the top.
     * data-genre is intentionally "" so selectGenre("") resets back to All Genres.
     */
    const allItem = document.createElement("div");
    allItem.className = "genre-item genre-item-all";
    if (getCurrentTag() === "") {
      allItem.classList.add("selected");
    }
    allItem.textContent = "✦ All Genres";
    allItem.dataset["genre"] = "";
    genreDropdown.appendChild(allItem);

    // If filtering, show flat list
    if (filter) {
      const matches = findMatchingGenres(filter);

      const count = document.createElement("div");
      count.className = "genre-match-count";
      count.setAttribute("aria-live", "polite");
      count.textContent =
        matches.length === 1 ? "1 match" : `${matches.length} matches`;
      genreDropdown.appendChild(count);

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

    const selectedItem = genreDropdown.querySelector(
      ".selected",
    ) as HTMLElement | null;
    if (selectedItem) {
      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => {
          selectedItem.scrollIntoView({ block: "nearest" });
        });
      } else {
        selectedItem.scrollIntoView({ block: "nearest" });
      }
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
    items.forEach((item) => item.classList.remove("highlighted"));
  };

  /**
   * Navigate through the dropdown items
   * @param direction
   */
  const navigate = (direction: "up" | "down") => {
    const items = getItems();
    if (items.length === 0) return;

    if (direction === "down") {
      highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
    } else {
      if (highlightedIndex === 0) {
        // Already at top — escape back to the input
        resetHighlight();
        genreSearch?.focus();
        return;
      }
      highlightedIndex = Math.max(highlightedIndex - 1, 0);
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
      const genre = (items[highlightedIndex] as HTMLElement).dataset["genre"];
      // genre may be "" for the All Genres item — return it as-is (not null)
      return genre !== undefined ? genre : null;
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
