/**
 * Unit tests for URL utility functions: parseUrlParams & isValidMode
 *
 * Design notes
 * ─────────────
 * • Pure functions only — no DOM, no async, no network.
 * • window.location.search is stubbed via vi.stubGlobal so the node
 *   environment never touches a real browser object.
 * • Each beforeEach resets the stub to a clean empty-search state, giving
 *   every test a known baseline without order-dependency.
 * • Security edge-cases are first-class citizens here: anything that could
 *   reach the URL bar from user-controlled input is stress-tested to confirm
 *   the allow-list reject path fires before any value is trusted by the app.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseUrlParams, isValidMode } from '../../public/js/app';
import { ALL_GENRES } from '../../public/js/genres';
import type { DiscoveryMode } from '../../src/shared/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stub window.location.search for the duration of one test. */
function stubSearch(search: string): void {
  vi.stubGlobal('window', { location: { search } });
}

// ---------------------------------------------------------------------------
// isValidMode — type-guard contract
// ---------------------------------------------------------------------------

describe('isValidMode', () => {
  // ── Happy paths ──────────────────────────────────────────────────────────

  it('accepts "new" (the default discovery mode)', () => {
    expect(isValidMode('new')).toBe(true);
  });

  it('accepts "hot" (the trending discovery mode)', () => {
    expect(isValidMode('hot')).toBe(true);
  });

  // ── Fallback / rejection paths ───────────────────────────────────────────

  it('rejects an empty string', () => {
    expect(isValidMode('')).toBe(false);
  });

  it('rejects "top" (the internal Bandcamp API value — never exposed to UI)', () => {
    expect(isValidMode('top')).toBe(false);
  });

  it('rejects an arbitrary unknown string', () => {
    expect(isValidMode('trending')).toBe(false);
  });

  it('rejects null', () => {
    // Cast to satisfy TS while still verifying runtime behaviour.
    expect(isValidMode(null as unknown as string)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isValidMode(undefined as unknown as string)).toBe(false);
  });

  // ── Type-guard contract ──────────────────────────────────────────────────

  it('narrows the type to DiscoveryMode when truthy', () => {
    const raw: string = 'hot';
    if (isValidMode(raw)) {
      // TypeScript should accept this assignment without a cast.
      const mode: DiscoveryMode = raw;
      expect(mode).toBe('hot');
    } else {
      // Force failure if the guard incorrectly rejected a valid value.
      expect.fail('isValidMode should have returned true for "hot"');
    }
  });

  // ── Security: reject URL-injected / adversarial mode strings ────────────

  it('rejects a script-injection payload masquerading as a mode', () => {
    expect(isValidMode('<script>alert(1)</script>')).toBe(false);
  });

  it('rejects URL-encoded values (they must be decoded first by URLSearchParams, not passed raw)', () => {
    // If someone manually passes %22new%22 the guard must still reject it.
    expect(isValidMode('%22new%22')).toBe(false);
    expect(isValidMode('%6Eew')).toBe(false); // percent-encoded 'n'
  });

  it('rejects whitespace-padded modes that could bypass naive equality', () => {
    expect(isValidMode(' new')).toBe(false);
    expect(isValidMode('new ')).toBe(false);
    expect(isValidMode(' new ')).toBe(false);
    expect(isValidMode('\tnew')).toBe(false);
  });

  it('rejects unicode look-alike characters that visually resemble valid modes', () => {
    // U+0578 ARMENIAN SMALL LETTER XEH looks like 'n' in some fonts.
    expect(isValidMode('\u0578ew')).toBe(false);
    // Cyrillic 'h' + 'o' + 't'
    expect(isValidMode('\u04BBo\u0442')).toBe(false);
  });

  it('rejects an object coerced to string (prototype-pollution safety)', () => {
    // toString() of a plain object returns "[object Object]"
    expect(isValidMode({}.toString())).toBe(false);
  });

  it('rejects an excessively long string (DoS / buffer safety)', () => {
    expect(isValidMode('n'.repeat(10_000))).toBe(false);
  });

  it('is exhaustive — only exactly "new" and "hot" are accepted', () => {
    // Enumerate every value in the DiscoveryMode union to guard against
    // accidental additions that forget to update the validator.
    const ACCEPTED: DiscoveryMode[] = ['new', 'hot'];
    const CANDIDATES = [...ACCEPTED, 'top', 'best', 'latest', '', ' '];

    for (const c of CANDIDATES) {
      const expected = ACCEPTED.includes(c as DiscoveryMode);
      expect(isValidMode(c), `isValidMode("${c}") should be ${expected}`).toBe(expected);
    }
  });
});

// ---------------------------------------------------------------------------
// parseUrlParams — happy paths
// ---------------------------------------------------------------------------

describe('parseUrlParams — happy paths', () => {
  beforeEach(() => stubSearch(''));
  afterEach(() => vi.unstubAllGlobals());

  it('returns default values when no query string is present', () => {
    const result = parseUrlParams();
    expect(result.genre).toBe('');
    expect(result.mode).toBe('new');
  });

  it('returns default values for an empty query string', () => {
    stubSearch('?');
    const result = parseUrlParams();
    expect(result.genre).toBe('');
    expect(result.mode).toBe('new');
  });

  it('parses a valid genre', () => {
    stubSearch('?genre=breakcore');
    expect(parseUrlParams().genre).toBe('breakcore');
  });

  it('parses mode=new', () => {
    stubSearch('?mode=new');
    expect(parseUrlParams().mode).toBe('new');
  });

  it('parses mode=hot', () => {
    stubSearch('?mode=hot');
    expect(parseUrlParams().mode).toBe('hot');
  });

  it('parses both a valid genre and a valid mode together', () => {
    stubSearch('?genre=house&mode=hot');
    const result = parseUrlParams();
    expect(result.genre).toBe('house');
    expect(result.mode).toBe('hot');
  });

  it('parses every genre in ALL_GENRES without falling back to ""', () => {
    // Smoke-tests the entire allow-list so a genres.ts addition is caught here.
    for (const genre of ALL_GENRES) {
      stubSearch(`?genre=${genre}`);
      expect(parseUrlParams().genre, `genre "${genre}" should be accepted`).toBe(genre);
    }
  });

  it('ignores unknown extra parameters gracefully', () => {
    stubSearch('?genre=techno&mode=hot&utm_source=newsletter&referrer=test');
    const result = parseUrlParams();
    expect(result.genre).toBe('techno');
    expect(result.mode).toBe('hot');
  });

  it('returns the first genre value when the key is repeated (URLSearchParams behaviour)', () => {
    // URLSearchParams.get() returns the first occurrence.
    stubSearch('?genre=house&genre=techno');
    expect(parseUrlParams().genre).toBe('house');
  });
});

// ---------------------------------------------------------------------------
// parseUrlParams — invalid genre fallback
// ---------------------------------------------------------------------------

describe('parseUrlParams — invalid genre falls back to ""', () => {
  beforeEach(() => stubSearch(''));
  afterEach(() => vi.unstubAllGlobals());

  it('rejects a completely unknown genre string', () => {
    stubSearch('?genre=not-a-genre');
    expect(parseUrlParams().genre).toBe('');
  });

  it('rejects an empty genre param value', () => {
    stubSearch('?genre=');
    expect(parseUrlParams().genre).toBe('');
  });

  it('rejects a genre with leading/trailing whitespace (not in allow-list)', () => {
    stubSearch('?genre=%20breakcore%20'); // URL-encoded spaces
    expect(parseUrlParams().genre).toBe('');
  });

  it('rejects a genre string in the wrong case', () => {
    // ALL_GENRES contains only lowercase slugs.
    stubSearch('?genre=Breakcore');
    expect(parseUrlParams().genre).toBe('');

    stubSearch('?genre=HOUSE');
    expect(parseUrlParams().genre).toBe('');
  });

  it('rejects a genre string with a trailing slash', () => {
    stubSearch('?genre=house/');
    expect(parseUrlParams().genre).toBe('');
  });

  it('rejects a genre that is a substring of a valid genre', () => {
    // "break" is not in ALL_GENRES; only "breakcore" is.
    stubSearch('?genre=break');
    expect(parseUrlParams().genre).toBe('');
  });

  // ── Security: adversarial genre values ───────────────────────────────────

  it('rejects an XSS payload in the genre param', () => {
    stubSearch('?genre=<script>alert(document.cookie)</script>');
    expect(parseUrlParams().genre).toBe('');
  });

  it('rejects a javascript: URI scheme in the genre param', () => {
    stubSearch('?genre=javascript:alert(1)');
    expect(parseUrlParams().genre).toBe('');
  });

  it('rejects a SQL-injection-style string in the genre param', () => {
    stubSearch("?genre=' OR 1=1--");
    expect(parseUrlParams().genre).toBe('');
  });

  it('rejects a null-byte injected genre param', () => {
    // %00 decoded to \0 — not a valid slug character.
    stubSearch('?genre=house%00injected');
    expect(parseUrlParams().genre).toBe('');
  });

  it('rejects an oversized genre param (DoS resilience)', () => {
    const huge = 'a'.repeat(10_000);
    stubSearch(`?genre=${huge}`);
    expect(parseUrlParams().genre).toBe('');
  });

  it('rejects a path-traversal attempt in the genre param', () => {
    stubSearch('?genre=../../etc/passwd');
    expect(parseUrlParams().genre).toBe('');
  });

  it('rejects a prototype-pollution key disguised as a genre', () => {
    stubSearch('?genre=__proto__');
    expect(parseUrlParams().genre).toBe('');

    stubSearch('?genre=constructor');
    expect(parseUrlParams().genre).toBe('');
  });
});

// ---------------------------------------------------------------------------
// parseUrlParams — invalid mode fallback
// ---------------------------------------------------------------------------

describe('parseUrlParams — invalid mode falls back to "new"', () => {
  beforeEach(() => stubSearch(''));
  afterEach(() => vi.unstubAllGlobals());

  it('falls back to "new" for an unrecognised mode string', () => {
    stubSearch('?mode=trending');
    expect(parseUrlParams().mode).toBe('new');
  });

  it('falls back to "new" for an empty mode param value', () => {
    // params.get("mode") returns "" → falsy → defaults to "new" before guard.
    stubSearch('?mode=');
    expect(parseUrlParams().mode).toBe('new');
  });

  it('falls back to "new" when the mode param is missing entirely', () => {
    stubSearch('?genre=house');
    expect(parseUrlParams().mode).toBe('new');
  });

  it('falls back to "new" for "top" (Bandcamp internal; must never be URL-injected)', () => {
    stubSearch('?mode=top');
    expect(parseUrlParams().mode).toBe('new');
  });

  it('falls back to "new" for a mode value in the wrong case', () => {
    stubSearch('?mode=HOT');
    expect(parseUrlParams().mode).toBe('new');

    stubSearch('?mode=New');
    expect(parseUrlParams().mode).toBe('new');
  });

  it('falls back to "new" for a whitespace-padded mode value', () => {
    stubSearch('?mode=%20hot%20');
    expect(parseUrlParams().mode).toBe('new');
  });

  // ── Security: adversarial mode values ────────────────────────────────────

  it('falls back to "new" for an XSS payload in the mode param', () => {
    stubSearch('?mode=<img src=x onerror=alert(1)>');
    expect(parseUrlParams().mode).toBe('new');
  });

  it('falls back to "new" for an oversized mode param (DoS resilience)', () => {
    stubSearch(`?mode=${'z'.repeat(10_000)}`);
    expect(parseUrlParams().mode).toBe('new');
  });

  it('falls back to "new" for a null-byte injected mode param', () => {
    stubSearch('?mode=hot%00injected');
    expect(parseUrlParams().mode).toBe('new');
  });
});

// ---------------------------------------------------------------------------
// parseUrlParams — return-type shape guarantees
// ---------------------------------------------------------------------------

describe('parseUrlParams — return-type shape', () => {
  beforeEach(() => stubSearch(''));
  afterEach(() => vi.unstubAllGlobals());

  it('always returns an object with exactly a "genre" key and a "mode" key', () => {
    const result = parseUrlParams();
    expect(result).toHaveProperty('genre');
    expect(result).toHaveProperty('mode');
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('mode is always one of the two accepted DiscoveryMode values', () => {
    const validModes: DiscoveryMode[] = ['new', 'hot'];

    const scenarios = ['', '?mode=new', '?mode=hot', '?mode=invalid', '?mode=<xss>'];
    for (const search of scenarios) {
      stubSearch(search);
      expect(
        validModes.includes(parseUrlParams().mode),
        `mode must be valid for search="${search}"`
      ).toBe(true);
    }
  });

  it('genre is always either "" or a member of ALL_GENRES', () => {
    const scenarios = [
      '',
      '?genre=house',
      '?genre=not-a-genre',
      '?genre=<script>',
      '?genre=__proto__',
    ];
    for (const search of scenarios) {
      stubSearch(search);
      const { genre } = parseUrlParams();
      const isAllowed = genre === '' || ALL_GENRES.includes(genre as typeof ALL_GENRES[number]);
      expect(isAllowed, `genre="${genre}" for search="${search}" must be "" or in ALL_GENRES`).toBe(true);
    }
  });
});
