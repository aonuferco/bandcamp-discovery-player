import { describe, it, expect } from 'vitest';
import type { Request, Response } from 'express';
import {
  isBandcampApiResponse,
  transformAlbumData,
  getApiBody,
  isBandcampAlbumItem,
} from '../../src/server/routes/albums.js';
import { validateQuery, albumsQuerySchema } from '../../src/server/middleware/validate.js';

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

  it('accepts responses with mixed result_type (albums and songs)', () => {
    const response = {
      results: [
        {
          id: 123,
          title: 'Album 1',
          band_name: 'Band 1',
          primary_image: { image_id: 456 },
          item_url: 'https://example.com/album',
          result_type: 'a'
        },
        {
          id: 789,
          result_type: 's'
        }
      ],
      cursor: "abc"
    };
    expect(isBandcampApiResponse(response)).toBe(true);
  });

  it('rejects response if album item fails validation', () => {
    const response = {
      results: [
        {
          id: 123,
          title: 'Album 1',
          band_name: 'Band 1',
          primary_image: {},
          item_url: 'https://example.com/album',
          result_type: 'a'
        }
      ],
      cursor: "abc"
    };
    expect(isBandcampApiResponse(response)).toBe(false);
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

describe('isBandcampAlbumItem', () => {
  it('accepts correct album item', () => {
    const item = {
      id: 123,
      title: 'Valid Title',
      band_name: 'Valid Band',
      primary_image: { image_id: 456 },
      item_url: 'https://example.com',
      result_type: 'a'
    };
    expect(isBandcampAlbumItem(item)).toBe(true);
  });

  it('accepts album item with null fields', () => {
    const item = {
      id: 123,
      title: 'Valid Title',
      band_name: 'Valid Band',
      primary_image: { image_id: 456 },
      item_url: 'https://example.com',
      result_type: 'a',
      album_artist: null,
      label_name: null,
      track_count: null,
      release_date: null,
      featured_track: null
    };
    expect(isBandcampAlbumItem(item)).toBe(true);
  });

  it('rejects item with missing primary_image image_id', () => {
    const item = {
      id: 123,
      title: 'Valid Title',
      band_name: 'Valid Band',
      primary_image: {},
      item_url: 'https://example.com',
      result_type: 'a'
    };
    expect(isBandcampAlbumItem(item)).toBe(false);
  });

  it('rejects item with non-number id', () => {
    const item = {
      id: '123',
      title: 'Valid Title',
      band_name: 'Valid Band',
      primary_image: { image_id: 456 },
      item_url: 'https://example.com',
      result_type: 'a'
    };
    expect(isBandcampAlbumItem(item)).toBe(false);
  });
});

describe('validateQuery', () => {
  it('allows valid parameters', () => {
    const middleware = validateQuery(albumsQuerySchema);
    const req = {
      query: {
        page: '2',
        slice: 'hot',
        tag: 'synthwave'
      }
    } as unknown as Request;
    
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    const res = {
      status: () => res,
      json: () => res
    } as unknown as Response;

    middleware(req, res, next);
    expect(nextCalled).toBe(true);
    expect(req.query.page).toBe('2');
    expect(req.query.tag).toBe('synthwave');
  });

  it('rejects invalid page', () => {
    const middleware = validateQuery(albumsQuerySchema);
    const req = {
      query: {
        page: '-1'
      }
    } as unknown as Request;
    
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    
    let statusValue = 0;
    let jsonValue: unknown = null;
    const res = {
      status: (code: number) => {
        statusValue = code;
        return res;
      },
      json: (data: unknown) => {
        jsonValue = data;
        return res;
      }
    } as unknown as Response;

    middleware(req, res, next);
    expect(nextCalled).toBe(false);
    expect(statusValue).toBe(400);
    expect(jsonValue.error).toContain('Invalid page');
  });

  it('rejects invalid slice', () => {
    const middleware = validateQuery(albumsQuerySchema);
    const req = {
      query: {
        slice: 'invalid'
      }
    } as unknown as Request;
    
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    
    let statusValue = 0;
    const res = {
      status: (code: number) => {
        statusValue = code;
        return res;
      },
      json: () => res
    } as unknown as Response;

    middleware(req, res, next);
    expect(nextCalled).toBe(false);
    expect(statusValue).toBe(400);
  });

  it('rejects invalid tag containing special characters', () => {
    const middleware = validateQuery(albumsQuerySchema);
    const req = {
      query: {
        tag: 'synth_wave!'
      }
    } as unknown as Request;
    
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    
    let statusValue = 0;
    const res = {
      status: (code: number) => {
        statusValue = code;
        return res;
      },
      json: () => res
    } as unknown as Response;

    middleware(req, res, next);
    expect(nextCalled).toBe(false);
    expect(statusValue).toBe(400);
  });
});
