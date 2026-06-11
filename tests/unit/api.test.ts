import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAlbumService } from '../../public/js/api';
import type { Album } from '../../src/shared/types';

describe('createAlbumService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
    const result = await service.fetchAlbums(2, 'hot', 'ambient');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/albums?page=2&slice=hot&tag=ambient',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result).toEqual(mockAlbums);
  });

  it('uses default parameters when they are omitted', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });

    vi.stubGlobal('fetch', fetchMock);

    const service = createAlbumService();
    const result = await service.fetchAlbums();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/albums?page=1&slice=new',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result).toEqual([]);
  });

  it('throws an error for non-OK HTTP status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    vi.stubGlobal('fetch', fetchMock);

    const service = createAlbumService();
    await expect(service.fetchAlbums(1, 'new', '')).rejects.toThrow(
      'HTTP error! status: 500'
    );
  });

  it('throws an error on network failure', async () => {
    const networkError = new TypeError('Failed to fetch');
    const fetchMock = vi.fn().mockRejectedValue(networkError);

    vi.stubGlobal('fetch', fetchMock);

    const service = createAlbumService();
    await expect(service.fetchAlbums(1, 'new', '')).rejects.toThrow(
      'Failed to fetch'
    );
  });

  it('aborts the request and throws timeout error when response is slow', async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn().mockImplementation((_url, options) => {
      return new Promise((_resolve, reject) => {
        if (options?.signal) {
          if (options.signal.aborted) {
            const err = new Error('The operation was aborted.');
            err.name = 'AbortError';
            reject(err);
            return;
          }
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
    vi.advanceTimersByTime(10000);

    await expect(promise).rejects.toThrow('Request timed out after 10 seconds');

    vi.useRealTimers();
  });
});
