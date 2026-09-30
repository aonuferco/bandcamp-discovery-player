import { test, expect } from "@playwright/test";

const mockAlbums = [
  {
    title: "Static Cathedral",
    artist: "The Test Gaze",
    img: "/img/alternative.jpg",
    stream_url: "https://example.com/alternative.mp3",
    link: "https://example.bandcamp.com/",
    track_count: 9,
    release_date: "2026-09-23",
  },
];

test.describe("Alternative dark theme", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/albums**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAlbums),
      }),
    );
  });

  test("uses separate dark artwork for new and hot Alternative modes", async ({
    page,
  }) => {
    await page.goto("/?genre=shoegaze&mode=new");
    await expect(page.locator("#title")).toContainText("Static Cathedral");
    await expect(page.locator("body")).toHaveClass(
      /genre-theme-alternative-new/,
    );

    const lightBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    await page.locator("#theme-btn").click();
    await expect(page.locator("body")).toHaveClass(/theme-dark/);

    const darkNewBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    expect(darkNewBackground).not.toBe(lightBackground);
    expect(darkNewBackground).toContain("168, 168, 212");

    await page.locator("#hot-btn").click();
    await expect(page.locator("body")).toHaveClass(
      /genre-theme-alternative-hot/,
    );

    const darkHotBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    expect(darkHotBackground).not.toBe(darkNewBackground);
    expect(darkHotBackground).toContain("255, 61, 110");
  });
});
