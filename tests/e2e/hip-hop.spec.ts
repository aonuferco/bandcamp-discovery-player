import { test, expect } from "@playwright/test";

const mockAlbums = [
  {
    title: "Night Drip",
    artist: "The Test Tape",
    img: "/img/hip-hop.jpg",
    stream_url: "https://example.com/hip-hop.mp3",
    link: "https://example.bandcamp.com/",
    track_count: 12,
    release_date: "2026-09-23",
  },
];

test.describe("Hip-Hop dark theme", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/albums", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAlbums),
      }),
    );
  });

  test("uses separate dark artwork for new and hot Hip-Hop modes", async ({
    page,
  }) => {
    await page.goto("/?genre=boom-bap&mode=new");
    await expect(page.locator("#title")).toContainText("Night Drip");
    await expect(page.locator("body")).toHaveClass(/genre-theme-hip-hop-new/);

    const lightBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    await page.locator("#theme-btn").click();
    await expect(page.locator("body")).toHaveClass(/theme-dark/);

    const darkNewBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    expect(darkNewBackground).not.toBe(lightBackground);
    expect(darkNewBackground).toContain("123, 108, 255");

    await page.locator("#hot-btn").click();
    await expect(page.locator("body")).toHaveClass(/genre-theme-hip-hop-hot/);

    const darkHotBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    expect(darkHotBackground).not.toBe(darkNewBackground);
    expect(darkHotBackground).toContain("255, 59, 59");
  });
});
