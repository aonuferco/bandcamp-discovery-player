import { describe, it, expect } from 'vitest';
import { isBandcampApiResponse, transformAlbumData, getApiBody } from '../../src/server/routes/albums.js';

describe('getApiBody', () => {
  it('returns correct body for "new" slice', () => {
    const body = getApiBody('new', 'breakcore');
    expect(body.slice).toBe('new');
    expect(body.tag_norm_names).toEqual(['breakcore']);
  });

  it('maps "hot" to "top" for Bandcamp API', () => {
    const body = getApiBody('hot', null);
    expect(body.slice).toBe('top');
  });

  it('handles null tag with empty array', () => {
    const body = getApiBody('new', null);
    expect(body.tag_norm_names).toEqual([]);
  });
});

describe('isBandcampApiResponse', () => {
  it('validates correct response structure', () => {
    expect(isBandcampApiResponse({ results: [], cursor: "abc" })).toBe(true);
  });

  it('rejects null', () => {
    expect(isBandcampApiResponse(null)).toBe(false);
  });

  it('rejects missing cursor', () => {
    expect(isBandcampApiResponse({ results: [] })).toBe(false);
  });

  it('rejects non-array results', () => {
    expect(isBandcampApiResponse({ results: "string", cursor: "x" })).toBe(false);
  });
});

describe('transformAlbumData', () => {
  it('transforms album item correctly with all fields', () => {
    const input = {
      id: 123,
      title: 'Test Album',
      album_artist: 'Test Artist',
      band_name: 'Test Band',
      primary_image: { image_id: 456 },
      item_url: 'https://example.bandcamp.com/album/test',
      featured_track: {
        title: 'Track 1',
        duration: 180,
        stream_url: 'https://stream.url/track'
      },
      label_name: 'Test Label',
      track_count: 10,
      release_date: '2025-01-01',
      result_type: 'a' as const
    };

    const result = transformAlbumData(input);

    expect(result.id).toBe(123);
    expect(result.title).toBe('Test Album');
    expect(result.artist).toBe('Test Artist');
    expect(result.img).toBe('https://f4.bcbits.com/img/a456_10.jpg');
    expect(result.link).toBe('https://example.bandcamp.com/album/test');
    expect(result.stream_url).toBe('https://stream.url/track');
    expect(result.featured_track).toEqual({ title: 'Track 1', duration: 180 });
    expect(result.label_name).toBe('Test Label');
    expect(result.track_count).toBe(10);
    expect(result.band_name).toBe('Test Band');
    expect(result.release_date).toBe('2025-01-01');
  });

  it('uses band_name as fallback for artist', () => {
    const input = {
      id: 123,
      title: 'Test Album',
      album_artist: undefined,
      band_name: 'Fallback Band',
      primary_image: { image_id: 789 },
      item_url: 'https://example.bandcamp.com',
      featured_track: null,
      label_name: null,
      track_count: 0,
      release_date: null,
      result_type: 'a' as const
    };

    const result = transformAlbumData(input);
    expect(result.artist).toBe('Fallback Band');
  });

  it('handles missing featured_track with empty stream_url', () => {
    const input = {
      id: 123,
      title: 'Test Album',
      album_artist: 'Test Artist',
      band_name: 'Test Band',
      primary_image: { image_id: 456 },
      item_url: 'https://example.bandcamp.com',
      featured_track: undefined,
      result_type: 'a' as const
    };

    const result = transformAlbumData(input);
    expect(result.stream_url).toBe('');
    expect(result.featured_track).toBe(null);
  });
});
