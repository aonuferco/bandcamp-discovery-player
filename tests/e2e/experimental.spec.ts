import { test, expect } from "@playwright/test";

const mockAlbums = [
  {
    title: "Tape Overload",
    artist: "The Test Splice",
    img: "/img/experimental.jpg",
    stream_url: "https://example.com/experimental.mp3",
    link: "https://example.bandcamp.com/",
    track_count: 6,
    release_date: "2026-09-23",
  },
];

test.describe("Experimental dark theme", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/albums", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAlbums),
      }),
    );
  });

  test("uses separate dark artwork for new and hot Experimental modes", async ({
    page,
  }) => {
    await page.goto("/?genre=avant-garde&mode=new");
    await expect(page.locator("#title")).toContainText("Tape Overload");
    await expect(page.locator("body")).toHaveClass(
      /genre-theme-experimental-new/,
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
    expect(darkNewBackground).toContain("232, 224, 212");

    await page.locator("#hot-btn").click();
    await expect(page.locator("body")).toHaveClass(
      /genre-theme-experimental-hot/,
    );

    const darkHotBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    expect(darkHotBackground).not.toBe(darkNewBackground);
    expect(darkHotBackground).toContain("224, 123, 255");
  });
});
