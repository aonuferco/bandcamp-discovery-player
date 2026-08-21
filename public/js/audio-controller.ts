/**
 * audio-controller.ts
 * Manages audio element lifecycle, playback, and event handling.
 * Provides a clean API for play, pause, seek, volume, and error handling.
 */

import { loadPreferences, savePreferences } from "./preferences";

export const formatPlaybackTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  return `${minutes}:${(wholeSeconds % 60).toString().padStart(2, "0")}`;
};

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
  let progressInput: HTMLInputElement | null = null;
  let elapsedTime: HTMLElement | null = null;
  let remainingTime: HTMLElement | null = null;
  let errorCallback: (() => void) | null = null;
  let volumeChangeCallback: ((volume: number) => void) | null = null;

  const updateProgress = (): void => {
    if (!audioEl || !progressInput || !elapsedTime || !remainingTime) return;

    const duration = Number.isFinite(audioEl.duration) ? audioEl.duration : 0;
    const currentTime = Number.isFinite(audioEl.currentTime)
      ? audioEl.currentTime
      : 0;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    progressInput.value = progress.toString();
    progressInput.style.setProperty("--progress", `${progress}%`);
    elapsedTime.textContent = formatPlaybackTime(currentTime);
    remainingTime.textContent =
      duration > 0 ? `-${formatPlaybackTime(duration - currentTime)}` : "-0:00";
  };

  return {
    initialize(playerContainer: HTMLElement): void {
      if (audioEl) return; // Already initialized

      audioEl = document.createElement("audio");
      audioEl.controls = true;
      // allow autoplay by default for the embedded player
      audioEl.autoplay = true;
      audioEl.setAttribute("aria-label", "Album preview player");
      audioEl.style.width = "100%";
      audioEl.style.height = "40px";

      const source = document.createElement("source");
      source.type = "audio/mp3";
      // ensure an explicit src attribute exists to satisfy tests that
      // read getAttribute('src') or source.src immediately after creation
      source.setAttribute("src", "");
      audioEl.appendChild(source);

      // Restore saved volume
      audioEl.volume = loadPreferences().volume;

      const progress = document.createElement("div");
      progress.className = "track-progress";

      elapsedTime = document.createElement("span");
      elapsedTime.className = "track-time track-time-elapsed";
      elapsedTime.textContent = "0:00";

      progressInput = document.createElement("input");
      progressInput.className = "track-progress-bar";
      progressInput.type = "range";
      progressInput.min = "0";
      progressInput.max = "100";
      progressInput.step = "0.1";
      progressInput.value = "0";
      progressInput.setAttribute("aria-label", "Track playback position");

      remainingTime = document.createElement("span");
      remainingTime.className = "track-time track-time-remaining";
      remainingTime.textContent = "-0:00";

      progress.append(elapsedTime, progressInput, remainingTime);

      // Wire up persistent listeners (registered exactly once)
      audioEl.addEventListener("volumechange", () => {
        savePreferences({ volume: audioEl!.volume });
        if (volumeChangeCallback) {
          volumeChangeCallback(audioEl!.volume);
        }
      });

      audioEl.addEventListener("timeupdate", updateProgress);
      audioEl.addEventListener("loadedmetadata", updateProgress);
      audioEl.addEventListener("durationchange", updateProgress);

      progressInput.addEventListener("input", () => {
        if (!audioEl || !progressInput || !Number.isFinite(audioEl.duration)) {
          return;
        }
        audioEl.currentTime =
          (Number(progressInput.value) / 100) * audioEl.duration;
        updateProgress();
      });

      audioEl.addEventListener("error", () => {
        if (errorCallback) {
          errorCallback();
        }
      });

      // Inject into DOM
      playerContainer.textContent = "";
      playerContainer.appendChild(audioEl);
      playerContainer.appendChild(progress);
    },

    loadTrack(streamUrl: string): void {
      if (!audioEl) return;
      const source = audioEl.querySelector("source")! as HTMLSourceElement;
      // Set the attribute first, then explicitly assign the property from the
      // attribute to avoid any environment-specific normalization differences
      // (jsdom sometimes resolves empty attributes to the document base URL).
      source.setAttribute("src", streamUrl);
      // assign property from attribute to keep .src and getAttribute('src') in sync
      source.src = source.getAttribute("src") || "";
      if (progressInput) progressInput.value = "0";
      if (elapsedTime) elapsedTime.textContent = "0:00";
      if (remainingTime) remainingTime.textContent = "-0:00";
      try {
        audioEl.load();
      } catch (e) {
        /* jsdom may not implement load() */
      }
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
