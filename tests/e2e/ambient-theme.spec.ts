import { test, expect } from "@playwright/test";

const mockAlbums = [
  {
    title: "Slow Current",
    artist: "The Test Drone",
    img: "/img/ambient.jpg",
    stream_url: "https://example.com/ambient.mp3",
    link: "https://example.bandcamp.com/",
    track_count: 4,
    release_date: "2026-09-23",
  },
];

test.describe("Ambient dark theme", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/albums", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAlbums),
      }),
    );
  });

  test("uses separate dark artwork for new and hot Ambient modes", async ({
    page,
  }) => {
    await page.goto("/?genre=dark-ambient&mode=new");
    await expect(page.locator("#title")).toContainText("Slow Current");
    await expect(page.locator("body")).toHaveClass(/genre-theme-ambient-new/);

    const lightBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    await page.locator("#theme-btn").click();
    await expect(page.locator("body")).toHaveClass(/theme-dark/);

    const darkNewBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    expect(darkNewBackground).not.toBe(lightBackground);
    expect(darkNewBackground).toContain("94, 224, 200");

    await page.locator("#hot-btn").click();
    await expect(page.locator("body")).toHaveClass(/genre-theme-ambient-hot/);

    const darkHotBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    expect(darkHotBackground).not.toBe(darkNewBackground);
    expect(darkHotBackground).toContain("155, 92, 255");
  });
});
