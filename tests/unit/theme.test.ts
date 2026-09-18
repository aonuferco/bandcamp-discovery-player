/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";
import { applyColorTheme, getNextColorTheme } from "../../public/js/theme";

describe("color theme", () => {
  beforeEach(() => {
    document.documentElement.style.colorScheme = "";
    document.body.className = "";
    document.body.innerHTML = '<button id="theme-btn"></button>';
  });

  it("applies dark mode and updates the toggle", () => {
    const toggle = document.getElementById(
      "theme-btn",
    ) as HTMLButtonElement | null;

    applyColorTheme("dark", toggle);

    expect(document.body.classList.contains("theme-dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(toggle?.getAttribute("aria-pressed")).toBe("true");
    expect(toggle?.getAttribute("aria-label")).toBe("Switch to light theme");
  });

  it("removes dark mode when light mode is applied", () => {
    document.body.classList.add("theme-dark");
    const toggle = document.getElementById(
      "theme-btn",
    ) as HTMLButtonElement | null;

    applyColorTheme("light", toggle);

    expect(document.body.classList.contains("theme-dark")).toBe(false);
    expect(toggle?.getAttribute("aria-pressed")).toBe("false");
    expect(toggle?.getAttribute("aria-label")).toBe("Switch to dark theme");
  });

  it("alternates between light and dark", () => {
    expect(getNextColorTheme("light")).toBe("dark");
    expect(getNextColorTheme("dark")).toBe("light");
  });
});
