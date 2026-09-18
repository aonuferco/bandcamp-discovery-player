import type { ColorTheme } from "./preferences";

const DARK_THEME_CLASS = "theme-dark";

export const applyColorTheme = (
  theme: ColorTheme,
  toggle: HTMLButtonElement | null,
): void => {
  const isDark = theme === "dark";
  document.body.classList.toggle(DARK_THEME_CLASS, isDark);
  document.documentElement.style.colorScheme = theme;

  if (toggle === null) return;

  toggle.setAttribute("aria-pressed", String(isDark));
  toggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light theme" : "Switch to dark theme",
  );
  toggle.title = isDark ? "Switch to light theme" : "Switch to dark theme";
};

export const getNextColorTheme = (theme: ColorTheme): ColorTheme =>
  theme === "dark" ? "light" : "dark";
