/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAppController } from '../../public/js/app';
import type { AppController } from '../../public/js/app';

describe('Keyboard Shortcuts', () => {
  let controller: AppController;
  // Track the registered keydown handler so we can remove it in afterEach.
  // Without this, each test's beforeEach adds a NEW handler to document and
  // they accumulate — causing e.g. seekAudio to run N times per key press.
  let registeredKeydownHandler: EventListener | null = null;

  beforeEach(() => {
    // Setup basic DOM elements required by app.ts
    document.body.innerHTML = `
      <div id="cover"></div>
      <div id="title"></div>
      <div id="artist"></div>
      <div id="track-info"></div>
      <div id="label-info"></div>
      <div id="track-count"></div>
      <div id="release-date"></div>
      <div id="player"></div>
      <button id="next"></button>
      <button id="prev"></button>
      <button id="help-btn"></button>
      <div id="help-modal"></div>
      <button id="close-modal"></button>
      <button id="retry"></button>
      <div id="search-container"></div>
      <input id="search-input" />
      <div id="genre-dropdown"></div>
      <div id="loading"></div>
      <div id="error"></div>
      <div id="toast-container"></div>
      <div id="toast"></div>
      <div id="theme-color"></div>
      <button id="copy-link-fab"></button>
      <button id="new-releases-btn"></button>
      <button id="hot-btn"></button>
    `;

    // Intercept addEventListener so we can capture and later remove the keydown handler
    const origAdd = document.addEventListener.bind(document);
    vi.spyOn(document, 'addEventListener').mockImplementation((type: string, handler: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions) => {
      if (type === 'keydown') {
        registeredKeydownHandler = handler as EventListener;
      }
      origAdd(type, handler, opts);
    });

    controller = createAppController();

    // Mock audio play/pause to avoid actual playback
    vi.spyOn(HTMLAudioElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLAudioElement.prototype, 'pause').mockReturnValue(undefined);

    controller.setupEventListeners();
    // Restore the spy — the real handler is now registered
    vi.mocked(document.addEventListener).mockRestore();
  });

  afterEach(() => {
    // Remove the keydown handler added by this test's controller
    if (registeredKeydownHandler) {
      document.removeEventListener('keydown', registeredKeydownHandler);
      registeredKeydownHandler = null;
    }
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  const fireKey = (key: string, target: HTMLElement | Document = document.body) => {
    const event = new KeyboardEvent('keydown', { key });
    Object.defineProperty(event, 'target', { value: target, enumerable: true });
    document.dispatchEvent(event);
  };

  const mockAlbum = {
    id: 1, title: 'Old', artist: 'Old', img: '', link: 'https://test.bandcamp.com', 
    stream_url: 'https://cdn.bandcamp.com/stream.mp3', featured_track: null, label_name: null, track_count: 0, 
    band_name: '', release_date: null 
  } as any;

  it('navigates to next album on "e"', async () => {
    // Need 5+ albums so needsMoreData() is false (avoids triggering async fetchAlbums)
    const albums = Array.from({ length: 5 }, (_, i) => ({
      ...mockAlbum, link: `https://test${i + 1}.bandcamp.com`
    }));
    controller.state.addAlbums(albums);
    controller.state.setCurrentIndex(0);
    const showAlbumSpy = vi.spyOn(controller.ui, 'showAlbum');
    fireKey('e');
    // nextAlbum is async — wait a tick for it to resolve
    await new Promise(r => setTimeout(r, 10));
    expect(showAlbumSpy).toHaveBeenCalled();
  });

  it('navigates to previous album on "q"', () => {
    const mockAlbum2 = { ...mockAlbum, link: 'https://test2.bandcamp.com' };
    controller.state.addAlbums([mockAlbum, mockAlbum2]);
    controller.state.setCurrentIndex(1);
    const showAlbumSpy = vi.spyOn(controller.ui, 'showAlbum');
    fireKey('q');
    expect(showAlbumSpy).toHaveBeenCalled();
  });

  it('copies album link on "w"', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    controller.state.addAlbums([mockAlbum]);
    controller.state.setCurrentIndex(0);
    fireKey('w');
    await new Promise(r => setTimeout(r, 0));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://test.bandcamp.com');
  });

  it('opens album page on "s"', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    controller.state.addAlbums([mockAlbum]);
    controller.state.setCurrentIndex(0);
    fireKey('s');
    expect(windowOpenSpy).toHaveBeenCalledWith('https://test.bandcamp.com', '_blank');
  });

  it('toggles audio on " "', () => {
    // Load an album to create the audio element
    controller.ui.showAlbum(mockAlbum);
    const audioEl = document.querySelector('#player audio') as HTMLAudioElement;
    
    // Spy on the HTMLMediaElement methods
    const playSpy = vi.spyOn(audioEl, 'play').mockResolvedValue(undefined);
    Object.defineProperty(audioEl, 'paused', { value: true, configurable: true });

    fireKey(' ');
    expect(playSpy).toHaveBeenCalled();
  });

  it('seeks audio back on "ArrowLeft"', () => {
    // Define duration on the prototype so seekAudio's isFinite(audio.duration) passes
    Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
      get: () => 120,
      configurable: true,
    });
    controller.ui.showAlbum(mockAlbum);
    const audioEl = document.querySelector('#player audio') as HTMLAudioElement;
    audioEl.currentTime = 30;

    fireKey('ArrowLeft');
    expect(audioEl.currentTime).toBe(20);
  });

  it('seeks audio forward on "ArrowRight"', () => {
    Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
      get: () => 120,
      configurable: true,
    });
    controller.ui.showAlbum(mockAlbum);
    const audioEl = document.querySelector('#player audio') as HTMLAudioElement;
    audioEl.currentTime = 30;

    fireKey('ArrowRight');
    expect(audioEl.currentTime).toBe(40);
  });

  it('closes modal on "Escape"', () => {
    const closeSpy = vi.spyOn(controller.ui, 'closeModal');
    fireKey('Escape');
    expect(closeSpy).toHaveBeenCalled();
  });

  it('does not trigger shortcuts when typing in an input', () => {
    const showAlbumSpy = vi.spyOn(controller.ui, 'showAlbum');
    const input = document.getElementById('search-input') as HTMLInputElement;
    
    const event = new KeyboardEvent('keydown', { key: 'e', bubbles: true });
    input.dispatchEvent(event);
    
    expect(showAlbumSpy).not.toHaveBeenCalled();
  });
});
