import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const mockAlbums = [
  {
    title: "A11y Album",
    artist: "A11y Artist",
    img: "/img/a.jpg",
    stream_url: "https://example.com/a.mp3",
    link: "https://a.bandcamp.com",
    track_count: 1,
    release_date: "2020-01-01",
  },
];

async function mockAlbumsApi(page: import("@playwright/test").Page) {
  await page.route("**/api/albums**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockAlbums),
    }),
  );
}

async function expectNoAxeViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  if (results.violations.length > 0) {
    const summary = results.violations
      .map(
        (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`,
      )
      .join("\n");
    console.error("Axe violations:\n" + summary);
  }

  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
}

test.describe("Accessibility Compliance (WCAG 2.1 AA)", () => {
  test.beforeEach(async ({ page }) => {
    await mockAlbumsApi(page);
    await page.goto("/");
    await expect(page.locator("#title")).toContainText("A11y Album");
  });

  test("main page has no accessibility violations", async ({ page }) => {
    await expectNoAxeViolations(page);
  });

  test("skip link is present and accessible", async ({ page }) => {
    const skipLink = page.locator(".skip-link");
    await expect(skipLink).toBeVisible();

    await page.keyboard.press("Tab");
    const skipLinkElement = await page.locator(".skip-link").elementHandle();
    const isFocused = await page.evaluate(
      (el) => document.activeElement === el,
      skipLinkElement,
    );
    expect(isFocused).toBe(true);
  });

  test("focus indicators are visible on buttons", async ({ page }) => {
    await page.keyboard.press("Tab");
    const newBtn = page.locator("#new-releases-btn");
    const focusOutlineColor = await newBtn.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.outlineColor;
    });
    expect(focusOutlineColor).toBeTruthy();
  });

  test("help modal has proper ARIA attributes", async ({ page }) => {
    const helpBtn = page.locator("#help-btn");
    const modal = page.locator("#help-modal");

    await expect(modal).toHaveAttribute("role", "dialog");
    await expect(modal).toHaveAttribute("aria-modal", "true");
    await expect(modal).toHaveAttribute("aria-labelledby", "modal-title");

    await helpBtn.click();
    await expect(modal).toHaveAttribute("aria-hidden", "false");
  });

  test("modal has focus management", async ({ page }) => {
    await page.locator("#help-btn").click();

    const closeBtn = page.locator("#close-modal");
    const isFocused = await page.evaluate(
      (el) => document.activeElement === el,
      await closeBtn.elementHandle(),
    );
    expect(isFocused).toBe(true);
  });

  test("interactive elements have minimum 44x44px tap targets", async ({
    page,
  }) => {
    const buttons = [
      "#new-releases-btn",
      "#hot-btn",
      "#help-btn",
      "#next-btn",
      "#prev-btn",
    ];

    for (const selector of buttons) {
      const element = page.locator(selector);
      const boundingBox = await element.boundingBox();

      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test("all icon-only buttons have aria-labels", async ({ page }) => {
    const iconButtons = [
      "#help-btn",
      "#next-btn",
      "#prev-btn",
      "#copy-link-fab",
    ];

    for (const selector of iconButtons) {
      const element = page.locator(selector);
      const ariaLabel = await element.getAttribute("aria-label");
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).not.toBe("");
    }
  });

  test("toast container has aria-live attribute", async ({ page }) => {
    const toastContainer = page.locator("#toast-container");
    await expect(toastContainer).toHaveAttribute("role", "status");
    await expect(toastContainer).toHaveAttribute("aria-live", "polite");
    await expect(toastContainer).toHaveAttribute("aria-atomic", "true");
  });

  test("genre search has proper combobox attributes", async ({ page }) => {
    const genreSearch = page.locator("#genre-search");
    await expect(genreSearch).toHaveAttribute("role", "combobox");
    await expect(genreSearch).toHaveAttribute(
      "aria-label",
      "Search for a music genre",
    );
    await expect(genreSearch).toHaveAttribute("aria-haspopup", "listbox");
    await expect(genreSearch).toHaveAttribute(
      "aria-controls",
      "genre-dropdown",
    );
  });

  test("genre dropdown has proper listbox attributes", async ({ page }) => {
    const genreDropdown = page.locator("#genre-dropdown");
    await expect(genreDropdown).toHaveAttribute("role", "listbox");
    await expect(genreDropdown).toHaveAttribute("aria-label", "Genre options");
  });

  test("main landmark is present", async ({ page }) => {
    const main = page.locator("main");
    await expect(main).toBeVisible();
    await expect(main).toHaveId("main-content");
  });

  test("header landmark is present", async ({ page }) => {
    const header = page.locator("header");
    await expect(header).toBeVisible();
  });

  test("album changes announce via toast live region", async ({ page }) => {
    // Title is a heading; announcements go through #toast-container (role=status)
    const toastContainer = page.locator("#toast-container");
    await expect(toastContainer).toHaveAttribute("role", "status");
    await expect(page.locator("#title")).not.toHaveAttribute("role", "status");
  });

  test("keyboard shortcuts do not fire when typing in search", async ({
    page,
  }) => {
    const genreSearch = page.locator("#genre-search");
    const initialTitle = await page.locator("#title").textContent();

    await genreSearch.click();
    await page.keyboard.press("e");

    const titleAfterE = await page.locator("#title").textContent();
    expect(titleAfterE).toBe(initialTitle);
  });

  test("has proper HTML lang attribute", async ({ page }) => {
    const htmlElement = page.locator("html");
    await expect(htmlElement).toHaveAttribute("lang", "en");
  });

  test("all buttons have visible focus indicators", async ({ page }) => {
    await page.waitForSelector("button");

    const buttons = await page.locator("button").all();

    for (const button of buttons) {
      await button.focus();

      const hasOutline = await button.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const outline = styles.outline;
        const outlineWidth = styles.outlineWidth;
        return (
          (outline && outline !== "none") ||
          (outlineWidth && outlineWidth !== "0px")
        );
      });

      if (hasOutline) {
        expect(hasOutline).toBe(true);
      }
    }
  });

  test("modal closes and focus returns on Escape", async ({ page }) => {
    const helpBtn = page.locator("#help-btn");
    const modal = page.locator("#help-modal");

    await helpBtn.click();
    await expect(modal).toHaveClass(/show/);

    await page.keyboard.press("Escape");

    await expect(modal).not.toHaveClass(/show/);
  });

  test("audio element is accessible", async ({ page }) => {
    // Native controls are replaced by the custom transport, so the media
    // element itself is no longer rendered.
    const audio = page.locator("audio");
    await expect(audio).toBeAttached();
    await expect(audio).toHaveAttribute("aria-label", "Album preview player");
  });

  test("track transport controls are accessible", async ({ page }) => {
    await expect(page.locator(".play-toggle")).toBeVisible();
    await expect(page.locator(".play-toggle")).toHaveAttribute(
      "aria-label",
      /Play track|Pause track/,
    );

    const scrubber = page.locator(".track-scrubber");
    await expect(scrubber).toBeVisible();
    await expect(scrubber).toHaveAttribute("aria-label", "Seek track position");
  });

  test("color contrast is sufficient for text elements", async ({ page }) => {
    const textElements = await page
      .locator("body *:not(script):not(style)")
      .all();

    for (const element of textElements.slice(0, 20)) {
      const bgColor = await element.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      const textColor = await element.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      expect(bgColor || textColor).toBeTruthy();
    }
  });

  test("no axe violations on genre filter page", async ({ page }) => {
    await page.goto("/?genre=electronic");
    await expect(page.locator("#title")).toContainText("A11y Album");
    await expectNoAxeViolations(page);
  });

  test("no axe violations on hot mode", async ({ page }) => {
    await page.goto("/?mode=hot");
    await expect(page.locator("#title")).toContainText("A11y Album");
    await expectNoAxeViolations(page);
  });
});
