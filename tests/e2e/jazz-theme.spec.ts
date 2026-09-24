import { test, expect } from "@playwright/test";
const mockAlbums = [
  {
    title: "Midnight Session",
    artist: "The Test Quartet",
    img: "/img/jazz.jpg",
    stream_url: "https://example.com/jazz.mp3",
    link: "https://example.bandcamp.com/",
    track_count: 7,
    release_date: "2026-09-23",
  },
];
test.describe("Jazz dark theme", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/albums", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAlbums),
      }),
    );
  });
  test("uses separate dark artwork for new and hot Jazz modes", async ({
    page,
  }) => {
    await page.goto("/?genre=nu-jazz&mode=new");
    await expect(page.locator("#title")).toContainText("Midnight Session");
    await expect(page.locator("body")).toHaveClass(/genre-theme-jazz-new/);
    const lightBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);
    await page.locator("#theme-btn").click();
    await expect(page.locator("body")).toHaveClass(/theme-dark/);
    const darkNewBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);
    expect(darkNewBackground).not.toBe(lightBackground);
    expect(darkNewBackground).toContain("89, 183, 255");
    await page.locator("#hot-btn").click();
    await expect(page.locator("body")).toHaveClass(/genre-theme-jazz-hot/);
    const darkHotBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);
    expect(darkHotBackground).not.toBe(darkNewBackground);
    expect(darkHotBackground).toContain("240, 191, 76");
  });
});
