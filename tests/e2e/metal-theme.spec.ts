import { test, expect } from "@playwright/test";

const mockAlbums = [
  {
    title: "Xerox Teeth",
    artist: "The Test Stamp",
    img: "/img/metal.jpg",
    stream_url: "https://example.com/metal.mp3",
    link: "https://example.bandcamp.com/",
    track_count: 8,
    release_date: "2026-09-23",
  },
];

test.describe("Metal dark theme", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/albums", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAlbums),
      }),
    );
  });

  test("uses separate dark artwork for new and hot Metal modes", async ({
    page,
  }) => {
    await page.goto("/?genre=death-metal&mode=new");
    await expect(page.locator("#title")).toContainText("Xerox Teeth");
    await expect(page.locator("body")).toHaveClass(/genre-theme-metal-new/);

    const lightBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    await page.locator("#theme-btn").click();
    await expect(page.locator("body")).toHaveClass(/theme-dark/);

    const darkNewBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    expect(darkNewBackground).not.toBe(lightBackground);
    expect(darkNewBackground).toContain("214, 224, 74");

    await page.locator("#hot-btn").click();
    await expect(page.locator("body")).toHaveClass(/genre-theme-metal-hot/);

    const darkHotBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    expect(darkHotBackground).not.toBe(darkNewBackground);
    expect(darkHotBackground).toContain("242, 235, 224");
  });
});
