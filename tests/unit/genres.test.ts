import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidGenre, ALL_GENRES, GENRES } from '../../public/js/genres';
import { parseUrlParams, isValidMode } from '../../public/js/app';

describe('isValidGenre', () => {
  it('returns true for valid genres', () => {
    expect(isValidGenre('breakcore')).toBe(true);
    expect(isValidGenre('dark-ambient')).toBe(true);
    expect(isValidGenre('indie-rock')).toBe(true);
  });

  it('returns false for invalid genres', () => {
    expect(isValidGenre('not-a-genre')).toBe(false);
    expect(isValidGenre('')).toBe(false);
  });

  it('returns false for null or undefined', () => {
    expect(isValidGenre(null)).toBe(false);
    expect(isValidGenre(undefined)).toBe(false);
  });
});

describe('ALL_GENRES', () => {
  it('is sorted alphabetically', () => {
    const sorted = [...ALL_GENRES].sort();
    expect(ALL_GENRES).toEqual(sorted);
  });

  it('contains expected items', () => {
    expect(ALL_GENRES).toContain('breakcore');
    expect(ALL_GENRES).toContain('dark-ambient');
    expect(ALL_GENRES).toContain('house');
  });
});

describe('GENRES', () => {
  it('has expected categories', () => {
    const categories = Object.keys(GENRES);
    expect(categories).toContain('ALTERNATIVE');
    expect(categories).toContain('ELECTRONIC');
    expect(categories).toContain('HIP-HOP');
  });
});

describe('isValidMode', () => {
  it('returns true for "new" and "hot"', () => {
    expect(isValidMode('new')).toBe(true);
    expect(isValidMode('hot')).toBe(true);
  });

  it('returns false for other strings', () => {
    expect(isValidMode('top')).toBe(false);
    expect(isValidMode('')).toBe(false);
    expect(isValidMode(null as any)).toBe(false);
  });
});

describe('parseUrlParams', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: {
        search: ''
      }
    });
  });

  it('returns default values when no params are present', () => {
    const result = parseUrlParams();
    expect(result.genre).toBe('');
    expect(result.mode).toBe('new');
  });

  it('parses valid genre and mode correctly', () => {
    vi.stubGlobal('window', {
      location: {
        search: '?genre=breakcore&mode=hot'
      }
    });
    const result = parseUrlParams();
    expect(result.genre).toBe('breakcore');
    expect(result.mode).toBe('hot');
  });

  it('handles invalid genre by returning empty string', () => {
    vi.stubGlobal('window', {
      location: {
        search: '?genre=invalid-genre'
      }
    });
    const result = parseUrlParams();
    expect(result.genre).toBe('');
  });

  it('handles invalid mode by defaulting to "new"', () => {
    vi.stubGlobal('window', {
      location: {
        search: '?mode=invalid-mode'
      }
    });
    const result = parseUrlParams();
    expect(result.mode).toBe('new');
  });

  it('is case sensitive for genres as per current implementation', () => {
    // Current implementation uses ALL_GENRES.includes(genre as Genre)
    // and ALL_GENRES contains lowercase strings.
    vi.stubGlobal('window', {
      location: {
        search: '?genre=Breakcore'
      }
    });
    const result = parseUrlParams();
    expect(result.genre).toBe('');
  });
});
