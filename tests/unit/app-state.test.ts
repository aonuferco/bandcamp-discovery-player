import { describe, it, expect, beforeEach } from 'vitest';
import { createAppState } from '../../public/js/state';
import type { Album } from '../../src/shared/types';

describe('AppState', () => {
  let state: ReturnType<typeof createAppState>;

  const mockAlbum = (id: string): Album => ({
    link: `https://bandcamp.com/album/${id}`,
    title: `Album ${id}`,
    artist: `Artist ${id}`,
    image: `https://f4.bcbits.com/img/a${id}_10.jpg`,
    track_url: `https://bandcamp.com/track/${id}`,
    genre: 'electronic'
  });

  beforeEach(() => {
    state = createAppState();
  });

  describe('addAlbums & Deduplication', () => {
    it('adds new albums to the state', () => {
      const albums = [mockAlbum('1'), mockAlbum('2')];
      state.addAlbums(albums);
      expect(state.getAlbums()).toHaveLength(2);
      expect(state.getAlbums()).toEqual(albums);
    });

    it('deduplicates albums based on link (seenLinks)', () => {
      state.addAlbums([mockAlbum('1'), mockAlbum('2')]);
      expect(state.getAlbums()).toHaveLength(2);

      // Add same albums again
      state.addAlbums([mockAlbum('1'), mockAlbum('3')]);
      
      // Should only add '3' because '1' was already seen
      expect(state.getAlbums()).toHaveLength(3);
      expect(state.getAlbums().map(a => a.link)).toEqual([
        mockAlbum('1').link,
        mockAlbum('2').link,
        mockAlbum('3').link
      ]);
    });
  });

  describe('needsMoreData (Threshold Boundary)', () => {
    // preloadThreshold is 3
    it('returns true when remaining albums are at or below threshold', () => {
      state.addAlbums([mockAlbum('1'), mockAlbum('2'), mockAlbum('3')]);
      state.setCurrentIndex(0);
      // albums.length (3) - currentIndex (0) = 3. <= 3 is true.
      expect(state.needsMoreData()).toBe(true);
    });

    it('returns false when remaining albums exceed threshold', () => {
      state.addAlbums([mockAlbum('1'), mockAlbum('2'), mockAlbum('3'), mockAlbum('4')]);
      state.setCurrentIndex(0);
      // 4 - 0 = 4. > 3 is false.
      expect(state.needsMoreData()).toBe(false);
    });

    it('becomes true as we advance closer to the end', () => {
      state.addAlbums([mockAlbum('1'), mockAlbum('2'), mockAlbum('3'), mockAlbum('4')]);
      state.setCurrentIndex(0);
      expect(state.needsMoreData()).toBe(false);

      state.incrementCurrentIndex(); // index 1. 4 - 1 = 3.
      expect(state.needsMoreData()).toBe(true);
    });

    it('is true when state is empty', () => {
      expect(state.needsMoreData()).toBe(true);
    });
  });

  describe('Navigation (canGoPrev / canGoNext)', () => {
    it('handles canGoPrev edge cases', () => {
      expect(state.canGoPrev()).toBe(false);

      state.addAlbums([mockAlbum('1'), mockAlbum('2')]);
      expect(state.canGoPrev()).toBe(false);

      state.setCurrentIndex(1);
      expect(state.canGoPrev()).toBe(true);

      state.setCurrentIndex(0);
      expect(state.canGoPrev()).toBe(false);
    });

    it('handles canGoNext edge cases', () => {
      expect(state.canGoNext()).toBe(false);

      state.addAlbums([mockAlbum('1'), mockAlbum('2')]);
      expect(state.canGoNext()).toBe(true);

      state.setCurrentIndex(1);
      expect(state.canGoNext()).toBe(false);
    });
  });

  describe('resetState', () => {
    it('resets all core state variables including isFetching', () => {
      state.addAlbums([mockAlbum('1')]);
      state.setCurrentIndex(1);
      state.setCurrentPage(5);
      state.setIsFetching(true);
      state.setLastError(new Error('test'));
      
      state.resetState();

      expect(state.getAlbums()).toHaveLength(0);
      expect(state.getCurrentIndex()).toBe(0);
      expect(state.getCurrentPage()).toBe(1);
      expect(state.getIsFetching()).toBe(false); // Verification of Day 1's fix
      expect(state.getLastError()).toBeNull();
    });

    it('clears seenLinks on reset', () => {
      state.addAlbums([mockAlbum('1')]);
      state.resetState();
      
      // If seenLinks wasn't cleared, re-adding the same album would be filtered out
      state.addAlbums([mockAlbum('1')]);
      expect(state.getAlbums()).toHaveLength(1);
    });
  });

  describe('Closure Integrity', () => {
    it('maintains independent state between instances', () => {
      const state1 = createAppState();
      const state2 = createAppState();

      state1.addAlbums([mockAlbum('1')]);
      
      expect(state1.getAlbums()).toHaveLength(1);
      expect(state2.getAlbums()).toHaveLength(0);
    });
  });
});
