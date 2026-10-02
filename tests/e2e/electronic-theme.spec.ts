import { test, expect } from "@playwright/test";

const mockAlbums = [
  {
    title: "Night Grid",
    artist: "The Test Sequencer",
    img: "/img/electronic.jpg",
    stream_url: "https://example.com/electronic.mp3",
    link: "https://example.bandcamp.com/",
    track_count: 8,
    release_date: "2026-09-23",
  },
];

test.describe("Electronic dark theme", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/albums**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAlbums),
      }),
    );
  });

  test("uses separate dark artwork for new and hot Electronic modes", async ({
    page,
  }) => {
    await page.goto("/?genre=techno&mode=new");
    await expect(page.locator("#title")).toContainText("Night Grid");
    await expect(page.locator("body")).toHaveClass(
      /genre-theme-electronic-new/,
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
    expect(darkNewBackground).toContain("244, 240, 230");

    await page.locator("#hot-btn").click();
    await expect(page.locator("body")).toHaveClass(
      /genre-theme-electronic-hot/,
    );

    const darkHotBackground = await page
      .locator("body")
      .evaluate((body) => window.getComputedStyle(body).backgroundImage);

    expect(darkHotBackground).not.toBe(darkNewBackground);
    expect(darkHotBackground).toContain("255, 47, 149");
  });
});
