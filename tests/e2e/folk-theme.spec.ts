import { test, expect } from "@playwright/test";

const mockAlbums = [
  {
    title: "Quilt Song",
    artist: "The Test Notebook",
    img: "/img/folk.jpg",
    stream_url: "https://example.com/folk.mp3",
    link: "https://example.bandcamp.com/",
    track_count: 10,
    release_date: "2026-09-23",
  },
];

test.describe("Folk dark theme", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/albums", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAlbums),
      }),
    );
  });

  test("uses separate dark artwork for new and hot Folk modes", async ({
    page,
  }) => {
    await page.goto("/?genre=indie-folk&mode=new");
    await expect(page.locator("#title")).toContainText("Quilt Song");
    await expect(page.locator("body")).toHaveClass(/genre-theme-folk-new/);

    const lightBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    await page.locator("#theme-btn").click();
    await expect(page.locator("body")).toHaveClass(/theme-dark/);

    const darkNewBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    expect(darkNewBackground).not.toBe(lightBackground);
    expect(darkNewBackground).toContain("197, 214, 122");

    await page.locator("#hot-btn").click();
    await expect(page.locator("body")).toHaveClass(/genre-theme-folk-hot/);

    const darkHotBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    expect(darkHotBackground).not.toBe(darkNewBackground);
    expect(darkHotBackground).toContain("232, 93, 58");
  });
});
