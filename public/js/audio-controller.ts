import { loadPreferences, savePreferences } from "./preferences.js";

/**
 * audio-controller.ts
 * Manages audio element lifecycle, playback, and event handling.
 * Provides a clean API for play, pause, seek, volume, and error handling.
 */

/**
 * Formats seconds as m:ss. Duration is NaN until a stream's metadata
 * arrives, which renders as 0:00 rather than leaking NaN into the UI.
 */
export const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
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
  let errorCallback: (() => void) | null = null;
  let volumeChangeCallback: ((volume: number) => void) | null = null;
  let volumeSlider: HTMLInputElement | null = null;

  let playToggle: HTMLButtonElement | null = null;
  let scrubber: HTMLInputElement | null = null;
  let elapsedEl: HTMLElement | null = null;
  let remainingEl: HTMLElement | null = null;
  // While a drag is in progress the thumb owns the position, so timeupdate
  // must not write back over it.
  let isScrubbing = false;

  const playAudio = async (): Promise<void> => {
    const el = audioEl;
    if (!el) return;
    try {
      await el.play();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to play audio", err);
    }
  };

  const syncProgress = (): void => {
    const el = audioEl;
    if (!el || !scrubber || !elapsedEl || !remainingEl) return;

    const duration = Number.isFinite(el.duration) ? el.duration : 0;
    const current = Number.isFinite(el.currentTime) ? el.currentTime : 0;

    scrubber.max = String(duration);
    scrubber.disabled = duration === 0;
    if (!isScrubbing) {
      scrubber.value = String(duration > 0 ? Math.min(current, duration) : 0);
    }

    const shown = Number(scrubber.value);
    // WebKit has no ::-moz-range-progress equivalent, so the elapsed fill is
    // painted by the track's gradient off this custom property.
    const percent = duration > 0 ? (shown / duration) * 100 : 0;
    scrubber.style.setProperty("--progress", `${percent}%`);

    elapsedEl.textContent = formatTime(shown);
    remainingEl.textContent = `-${formatTime(Math.max(0, duration - shown))}`;
    scrubber.setAttribute(
      "aria-valuetext",
      `${formatTime(shown)} elapsed of ${formatTime(duration)}`,
    );
  };

  const syncPlayState = (): void => {
    const el = audioEl;
    if (!el || !playToggle) return;
    playToggle.textContent = el.paused ? "▶" : "❚❚";
    playToggle.setAttribute(
      "aria-label",
      el.paused ? "Play track" : "Pause track",
    );
  };

  const syncVolume = (): void => {
    const el = audioEl;
    if (!el || !volumeSlider) return;
    volumeSlider.value = String(el.volume);
    volumeSlider.style.setProperty("--progress", `${el.volume * 100}%`);
    volumeSlider.setAttribute(
      "aria-valuetext",
      `Volume ${Math.round(el.volume * 100)}%`,
    );
  };

  const buildTransport = (): HTMLElement => {
    const transport = document.createElement("div");
    transport.className = "track-progress";
    transport.setAttribute("role", "group");
    transport.setAttribute("aria-label", "Track playback");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "play-toggle";
    toggle.textContent = "▶";
    toggle.setAttribute("aria-label", "Play track");
    toggle.addEventListener("click", () => {
      const el = audioEl;
      if (!el) return;
      if (el.paused) {
        void playAudio();
      } else {
        el.pause();
      }
    });

    const elapsed = document.createElement("span");
    elapsed.className = "track-time track-time-elapsed";
    elapsed.textContent = "0:00";

    const range = document.createElement("input");

    range.type = "range";
    range.className = "track-scrubber zine-range";
    range.min = "0";
    range.max = "0";
    range.step = "0.1";
    range.value = "0";
    range.disabled = true;
    range.setAttribute("aria-label", "Seek track position");

    // `input` only previews the new position; the seek is committed on
    // `change` so dragging does not re-request the stream on every frame.
    range.addEventListener("input", () => {
      isScrubbing = true;
      syncProgress();
    });

    range.addEventListener("change", () => {
      isScrubbing = false;
      const el = audioEl;
      if (!el) return;
      const target = Number(range.value);
      if (Number.isFinite(target)) {
        el.currentTime = target;
      }
      syncProgress();
    });

    const volumeControl = document.createElement("div");
    volumeControl.className = "volume-control";

    const volumeIcon = document.createElement("span");
    volumeIcon.className = "volume-icon";
    volumeIcon.textContent = "VOL";
    volumeIcon.setAttribute("aria-hidden", "true");

    const volume = document.createElement("input");
    volume.type = "range";
    volume.className = "volume-slider zine-range";
    volume.min = "0";
    volume.max = "1";
    volume.step = "0.01";
    volume.setAttribute("aria-label", "Volume");
    volume.addEventListener("input", () => {
      const el = audioEl;
      if (!el) return;
      el.volume = Number(volume.value);
    });

    volumeControl.appendChild(volumeIcon);
    volumeControl.appendChild(volume);

    const remaining = document.createElement("span");
    remaining.className = "track-time track-time-remaining";
    remaining.textContent = "-0:00";

    transport.appendChild(toggle);
    transport.appendChild(elapsed);
    transport.appendChild(range);
    transport.appendChild(remaining);
    transport.appendChild(volumeControl);

    playToggle = toggle;
    elapsedEl = elapsed;
    scrubber = range;
    remainingEl = remaining;
    volumeSlider = volume;

    return transport;
  };

  return {
    initialize(playerContainer: HTMLElement): void {
      if (audioEl) return; // Already initialized

      audioEl = document.createElement("audio");
      // Native chrome is replaced by the custom transport built below.
      audioEl.controls = false;
      // allow autoplay by default for the embedded player
      audioEl.autoplay = true;
      audioEl.setAttribute("aria-label", "Album preview player");

      const source = document.createElement("source");
      source.type = "audio/mp3";
      // ensure an explicit src attribute exists to satisfy tests that
      // read getAttribute('src') or source.src immediately after creation
      source.setAttribute("src", "");
      audioEl.appendChild(source);

      // Restore saved volume
      audioEl.volume = loadPreferences().volume;

      // Wire up persistent listeners (registered exactly once)
      audioEl.addEventListener("volumechange", () => {
        savePreferences({ volume: audioEl!.volume });
        // Keeps the slider in step with the keyboard shortcuts
        syncVolume();
        if (volumeChangeCallback) {
          volumeChangeCallback(audioEl!.volume);
        }
      });

      audioEl.addEventListener("error", () => {
        if (errorCallback) {
          errorCallback();
        }
      });

      audioEl.addEventListener("loadedmetadata", syncProgress);
      audioEl.addEventListener("durationchange", syncProgress);
      audioEl.addEventListener("timeupdate", syncProgress);
      audioEl.addEventListener("emptied", syncProgress);
      audioEl.addEventListener("play", syncPlayState);
      audioEl.addEventListener("pause", syncPlayState);
      audioEl.addEventListener("ended", syncPlayState);

      const transport = buildTransport();

      // Inject into DOM
      playerContainer.textContent = "";
      playerContainer.appendChild(audioEl);
      playerContainer.appendChild(transport);

      syncProgress();
      syncPlayState();
      syncVolume();
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
      try {
        audioEl.load();
      } catch (e) {
        /* jsdom may not implement load() */
      }

      // A new track starts from zero with an unknown duration
      isScrubbing = false;
      if (scrubber) {
        scrubber.max = "0";
        scrubber.value = "0";
        scrubber.disabled = true;
      }
      syncProgress();
      syncPlayState();
    },

    async play(): Promise<void> {
      await playAudio();
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
      syncProgress();
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
