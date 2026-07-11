import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAlbumService } from '../../public/js/api';
import type { Album } from '../../src/shared/types';

describe('createAlbumService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('handles successful response with correct parameters', async () => {
    const mockAlbums: Album[] = [
      {
        id: 1,
        title: 'Album 1',
        artist: 'Artist 1',
        img: 'img1.jpg',
        link: 'link1',
        stream_url: 'stream1',
        featured_track: { title: 'Track 1', duration: 120 },
        label_name: 'Label 1',
        track_count: 5,
        band_name: 'Band 1',
        release_date: '2025-01-01',
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockAlbums,
    });

    vi.stubGlobal('fetch', fetchMock);

    const service = createAlbumService();
    const { data, error } = await service.fetchAlbums(2, 'hot', 'ambient');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/albums?page=2&slice=hot&tag=ambient',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(data).toEqual(mockAlbums);
    expect(error).toBeNull();
  });

  it('uses default parameters when they are omitted', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });

    vi.stubGlobal('fetch', fetchMock);

    const service = createAlbumService();
    const { data, error } = await service.fetchAlbums();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/albums?page=1&slice=new',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });

  it('returns HTTP error for non-OK HTTP status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    vi.stubGlobal('fetch', fetchMock);

    const service = createAlbumService();
    const { data, error } = await service.fetchAlbums(1, 'new', '');
    
    expect(data).toBeNull();
    expect(error?.type).toBe('http');
    expect(error?.status).toBe(500);
  });

  it('returns network error on network failure after retries', async () => {
    const networkError = new TypeError('Failed to fetch');
    const fetchMock = vi.fn().mockRejectedValue(networkError);

    vi.stubGlobal('fetch', fetchMock);

    const service = createAlbumService();
    
    // We need to advance timers because of the exponential backoff in api.ts
    const promise = service.fetchAlbums(1, 'new', '');
    
    await vi.runAllTimersAsync();
    
    const { data, error } = await promise;

    expect(data).toBeNull();
    expect(error?.type).toBe('network');
    expect(error?.message).toContain('Failed to fetch');
    expect(fetchMock).toHaveBeenCalledTimes(2); // Initial request + 1 retry
  });

  it('returns timeout error when response is slow', async () => {
    const fetchMock = vi.fn().mockImplementation((_url, options) => {
      return new Promise((_resolve, reject) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted.');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const service = createAlbumService();
    const promise = service.fetchAlbums(1, 'new', '');

    // Advance time by 10 seconds to trigger timeout
    await vi.advanceTimersByTimeAsync(10000);

    const { data, error } = await promise;
    expect(data).toBeNull();
    expect(error?.type).toBe('timeout');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns parse error when json parsing fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => { throw new Error('Invalid JSON'); },
    });

    vi.stubGlobal('fetch', fetchMock);

    const service = createAlbumService();
    const { data, error } = await service.fetchAlbums(1, 'new', '');
    
    expect(data).toBeNull();
    expect(error?.type).toBe('parse');
    expect(error?.message).toBe('Failed to parse response');
  });
});
