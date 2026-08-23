import type { DiscoveryMode } from "../../src/shared/types";
import { isValidGenre } from "./genres";

export interface UserPreferences {
  volume: number;
  mode: DiscoveryMode;
  genre: string;
}

const STORAGE_KEY = "bandcamp-discovery-preferences";
const LEGACY_VOLUME_KEY = "bandcamp-volume";

export const DEFAULT_PREFERENCES: UserPreferences = {
  volume: 0.2,
  mode: "new",
  genre: "",
};

const clampVolume = (value: unknown): number => {
  if (value === null || value === undefined || value === "") {
    return DEFAULT_PREFERENCES.volume;
  }
  const volume = typeof value === "number" ? value : Number(value);
  return Number.isFinite(volume)
    ? Math.max(0, Math.min(1, volume))
    : DEFAULT_PREFERENCES.volume;
};

export const loadPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored
      ? (JSON.parse(stored) as Partial<UserPreferences>)
      : {};
    const legacyVolume = localStorage.getItem(LEGACY_VOLUME_KEY);
    return {
      volume: clampVolume(parsed.volume ?? legacyVolume),
      mode: parsed.mode === "hot" ? "hot" : "new",
      genre:
        typeof parsed.genre === "string" && isValidGenre(parsed.genre)
          ? parsed.genre
          : "",
    };
  } catch (error) {
    return { ...DEFAULT_PREFERENCES };
  }
};

export const savePreferences = (
  update: Partial<UserPreferences>,
): UserPreferences => {
  const preferences = {
    ...loadPreferences(),
    ...update,
  };
  const normalized: UserPreferences = {
    volume: clampVolume(preferences.volume),
    mode: preferences.mode === "hot" ? "hot" : "new",
    genre: isValidGenre(preferences.genre) ? preferences.genre : "",
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    // Preferences are optional; private browsing or storage limits may prevent saving. Ignore errors.
  }
  return normalized;
};
