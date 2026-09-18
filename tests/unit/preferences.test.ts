/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
} from "../../public/js/preferences";

const STORAGE_KEY = "bandcamp-discovery-preferences";

describe("user preferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to the light theme", () => {
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
    expect(loadPreferences()).toBe("light");
  });

  it("loads a saved dark theme", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_PREFERENCES, theme: "dark " }),
    );

    expect(loadPreferences().theme).toBe("dark");
  });

  it("normalizes an invialid saved theme to light", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_PREFERENCES, theme: "sepia" }),
    );

    expect(loadPreferences().theme).toBe("light");
  });

  it("saves theme updates without dropping existing preferences", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        volume: 0.7,
        mode: "hot",
        genre: "nu-jazz",
        theme: "light",
      }),
    );

    const preferences = savePreferences({ theme: "dark" });

    expect(preferences).toMatchObject({
      volume: 0.7,
      mode: "hot",
      genre: "nu-jazz",
      theme: "dark",
    });
  });
});
