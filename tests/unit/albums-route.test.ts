import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import albumsRouter from '../../src/server/routes/albums.js';

let app: express.Application;
let server: Server;
let port: number;

const originalFetch = global.fetch;

beforeAll(async () => {
  app = express();
  app.use('/', albumsRouter);
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      port = (server.address() as any).port;
      resolve(undefined);
    });
  });
});

afterAll(() => {
  server.close();
});

describe('Albums Route Handler', () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.startsWith('http://localhost:')) {
        return originalFetch(input, init);
      }
      return new Response(JSON.stringify({
        cursor: "mock_cursor_123",
        results: [
          {
            result_type: "a",
            band_name: "Mock Band",
            item_url: "https://mock.bandcamp.com/album/mock-album",
            art_id: 1234,
            title: "Mock Album",
            type: "album",
            genre: "electronic",
            id: 1,
            primary_image: { image_id: 1234 }
          }
        ]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('handles valid requests with various params', async () => {
    const res = await originalFetch(`http://localhost:${port}/albums?slice=new&tag=breakcore&page=1`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].title).toBe('Mock Album');
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('bandcamp.com'), expect.any(Object));
  });

  it('returns 400 for invalid query params', async () => {
    const res = await originalFetch(`http://localhost:${port}/albums?slice=invalid_slice`);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('returns 502 for upstream failure', async () => {
    mockFetch.mockImplementationOnce(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.startsWith('http://localhost:')) {
        return originalFetch(input, init);
      }
      return new Response('Bad Gateway', { status: 502 });
    });

    const res = await originalFetch(`http://localhost:${port}/albums`);
    expect(res.status).toBe(502);
  });

  it('handles timeout correctly', async () => {
    mockFetch.mockImplementationOnce(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.startsWith('http://localhost:')) {
        return originalFetch(input, init);
      }
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    });

    const res = await originalFetch(`http://localhost:${port}/albums`);
    expect(res.status).toBe(504);
  });

  it('validates response shape from Bandcamp', async () => {
    mockFetch.mockImplementationOnce(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.startsWith('http://localhost:')) {
        return originalFetch(input, init);
      }
      return new Response(JSON.stringify({ bad_shape: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const res = await originalFetch(`http://localhost:${port}/albums`);
    expect(res.status).toBe(502);
  });
});
