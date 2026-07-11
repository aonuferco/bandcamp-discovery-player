/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAppController } from '../../public/js/app';
import type { AppController } from '../../public/js/app';
import type { Album } from '../../src/shared/types';

describe('Audio Player', () => {
  let controller: AppController;

  const mockAlbum: Album = {
    id: 1,
    title: 'Test Album',
    artist: 'Test Artist',
    img: 'test.jpg',
    link: 'https://test.com',
    stream_url: 'https://test.com/stream',
    featured_track: { title: 'Test Track', duration: 120, stream_url: 'https://test.com/track.mp3' },
    label_name: null,
    track_count: 5,
    band_name: 'Test Band',
    release_date: null
  };

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
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn()
      },
      writable: true
    });
    
    controller = createAppController();
    
    // Mock HTMLAudioElement
    vi.spyOn(HTMLAudioElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLAudioElement.prototype, 'pause').mockReturnValue(undefined);
    
    controller.setupEventListeners();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  const getAudioEl = () => document.querySelector('#player audio') as HTMLAudioElement;

  it('creates and updates audio element when album changes', () => {
    controller.ui.showAlbum(mockAlbum);
    const audioEl = getAudioEl();
    
    expect(audioEl).toBeTruthy();
    expect(audioEl.autoplay).toBe(true);
    
    const source = audioEl.querySelector('source') as HTMLSourceElement;
    expect(source.src).toBe(mockAlbum.stream_url);
  });

  it('toggles audio play/pause', () => {
    controller.ui.showAlbum(mockAlbum);
    const audioEl = getAudioEl();
    
    // initially paused (mock state)
    Object.defineProperty(audioEl, 'paused', { value: true, configurable: true });
    controller.toggleAudio();
    expect(audioEl.play).toHaveBeenCalled();
    
    // set to playing
    Object.defineProperty(audioEl, 'paused', { value: false, configurable: true });
    controller.toggleAudio();
    expect(audioEl.pause).toHaveBeenCalled();
  });

  it('seeks audio by given delta', () => {
    controller.ui.showAlbum(mockAlbum);
    const playerContainer = document.createElement('div');
    playerContainer.id = 'player';
    document.body.appendChild(playerContainer);
    const audioEl = getAudioEl();
    
    audioEl.currentTime = 50;
    Object.defineProperty(audioEl, 'duration', { value: 120, configurable: true });
    
    controller.seekAudio(-10);
    expect(audioEl.currentTime).toBe(40);
    
    controller.seekAudio(100); // 40 + 100 > 120
    expect(audioEl.currentTime).toBe(120);
    
    controller.seekAudio(-200); // 120 - 200 < 0
    expect(audioEl.currentTime).toBe(0);
  });

  it('saves volume when volumechange event occurs', () => {
    controller.ui.showAlbum(mockAlbum);
    const audioEl = getAudioEl();
    
    audioEl.volume = 0.5;
    audioEl.dispatchEvent(new Event('volumechange'));
    
    expect(window.localStorage.setItem).toHaveBeenCalledWith('bandcamp-volume', '0.5');
  });

  it('handles track error correctly', () => {
    controller.ui.showAlbum(mockAlbum);
    const audioEl = getAudioEl();
    
    audioEl.dispatchEvent(new Event('error'));
    
    const trackInfo = document.getElementById('track-info')!;
    expect(trackInfo.textContent).toBe('Track unavailable');
  });

  it('clears audio when album has no stream url', () => {
    controller.ui.showAlbum({ ...mockAlbum, stream_url: null as any });
    const audioEl = getAudioEl();
    
    if (audioEl) {
      const source = audioEl.querySelector('source') as HTMLSourceElement;
      expect(source.getAttribute('src')).toBe('');
    } else {
      expect(audioEl).toBeNull();
    }
  });
});
