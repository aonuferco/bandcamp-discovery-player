/**
 * audio-controller.ts
 * Manages audio element lifecycle, playback, and event handling.
 * Provides a clean API for play, pause, seek, volume, and error handling.
 */

export interface AudioController {
  /**
   * Initialize the audio element in the given container.
   * Should be called once before any playback.
   */
  initialize(playerContainer: HTMLElement): void;

  /**
   * Load and prepare an audio track from the given stream URL.
   */
  loadTrack(streamUrl: string): void;

  /**
   * Play the current audio track.
   */
  play(): Promise<void>;

  /**
   * Pause the current audio track.
   */
  pause(): void;

  /**
   * Toggle between play and pause states.
   */
  togglePlayPause(): void;

  /**
   * Seek to an offset in seconds relative to current time.
   * Clamps to valid bounds [0, duration].
   */
  seek(offsetSeconds: number): void;

  /**
   * Set volume (0.0 to 1.0).
   */
  setVolume(volume: number): void;

  /**
   * Get current volume level.
   */
  getVolume(): number;

  /**
   * Adjust volume by a given delta (e.g., +0.1 or -0.1).
   */
  adjustVolume(delta: number): void;

  /**
   * Get the underlying audio element (if needed for direct manipulation).
   */
  getAudioElement(): HTMLAudioElement | null;

  /**
   * Register a callback for when an error occurs during playback.
   */
  onError(callback: () => void): void;

  /**
   * Register a callback for when volume changes.
   */
  onVolumeChange(callback: (volume: number) => void): void;
}

/**
 * Creates and returns an AudioController instance.
 * Manages a persistent audio element to prevent listener leaks.
 */
export function createAudioController(): AudioController {
  let audioEl: HTMLAudioElement | null = null;
  let errorCallback: (() => void) | null = null;
  let volumeChangeCallback: ((volume: number) => void) | null = null;

  // Retrieve saved volume from localStorage, default to 0.2
  const getSavedVolume = (): number => {
    const saved = localStorage.getItem("bandcamp-volume");
    return saved ? parseFloat(saved) : 0.2;
  };

  // Save volume preference to localStorage
  const saveVolume = (volume: number): void => {
    localStorage.setItem("bandcamp-volume", volume.toString());
  };

  return {
    initialize(playerContainer: HTMLElement): void {
      if (audioEl) return; // Already initialized

      audioEl = document.createElement("audio");
      audioEl.controls = true;
      audioEl.style.width = "100%";
      audioEl.style.height = "40px";

      const source = document.createElement("source");
      source.type = "audio/mp3";
      audioEl.appendChild(source);

      // Restore saved volume
      audioEl.volume = getSavedVolume();

      // Wire up persistent listeners (registered exactly once)
      audioEl.addEventListener("volumechange", () => {
        saveVolume(audioEl!.volume);
        if (volumeChangeCallback) {
          volumeChangeCallback(audioEl!.volume);
        }
      });

      audioEl.addEventListener("error", () => {
        if (errorCallback) {
          errorCallback();
        }
      });

      // Inject into DOM
      playerContainer.textContent = "";
      playerContainer.appendChild(audioEl);
    },

    loadTrack(streamUrl: string): void {
      if (!audioEl) return;
      const source = audioEl.querySelector("source")!;
      source.src = streamUrl;
      audioEl.load();
    },

    async play(): Promise<void> {
      if (!audioEl) return;
      try {
        await audioEl.play();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to play audio", err);
      }
    },

    pause(): void {
      if (!audioEl) return;
      audioEl.pause();
    },

    togglePlayPause(): void {
      if (!audioEl) return;
      if (audioEl.paused) {
        this.play();
      } else {
        this.pause();
      }
    },

    seek(offsetSeconds: number): void {
      if (!audioEl || !isFinite(audioEl.duration)) return;
      const newTime = audioEl.currentTime + offsetSeconds;
      audioEl.currentTime = Math.max(0, Math.min(newTime, audioEl.duration));
    },

    setVolume(volume: number): void {
      if (!audioEl) return;
      audioEl.volume = Math.max(0, Math.min(1, volume));
    },

    getVolume(): number {
      return audioEl?.volume ?? 0;
    },

    adjustVolume(delta: number): void {
      if (!audioEl) return;
      const newVolume = Math.max(0, Math.min(1, audioEl.volume + delta));
      audioEl.volume = newVolume;
    },

    getAudioElement(): HTMLAudioElement | null {
      return audioEl;
    },

    onError(callback: () => void): void {
      errorCallback = callback;
    },

    onVolumeChange(callback: (volume: number) => void): void {
      volumeChangeCallback = callback;
    },
  };
}
