// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
} from "../../public/js/preferences";

describe("user preferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when nothing has been saved", () => {
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it("persists volume, mode, and genre together", () => {
    savePreferences({
      volume: 0.65,
      mode: "hot",
      genre: "electronic",
    });

    expect(loadPreferences()).toEqual({
      volume: 0.65,
      mode: "hot",
      genre: "electronic",
    });
  });

  it("normalizes invalid stored values", () => {
    localStorage.setItem(
      "bandcamp-discovery-preferences",
      JSON.stringify({
        volume: 5,
        mode: "invalid",
        genre: "<script>",
      }),
    );

    expect(loadPreferences()).toEqual({
      volume: 1,
      mode: "new",
      genre: "",
    });
  });
});
