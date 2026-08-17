import { test, expect } from "@playwright/test";

const page1 = [
  {
    title: "Album 1",
    artist: "A",
    img: "/img/a.jpg",
    stream_url: "https://example.com/a.mp3",
    link: "https://a.bandcamp.com",
  },
  {
    title: "Album 2",
    artist: "B",
    img: "/img/b.jpg",
    stream_url: "https://example.com/b.mp3",
    link: "https://b.bandcamp.com",
  },
];

const page2 = [
  {
    title: "Album 3",
    artist: "C",
    img: "/img/c.jpg",
    stream_url: "https://example.com/c.mp3",
    link: "https://c.bandcamp.com",
  },
];

test.describe("Navigation & URL state", () => {
  test("pagination loads more albums when approaching end", async ({
    page,
  }) => {
    await page.route("**/api/albums**", (route) => {
      const url = route.request().url();
      if (url.includes("page=2")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(page2),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(page1),
        });
      }
    });

    await page.addInitScript(() => {
      (HTMLMediaElement.prototype as any).play = async function () {
        (this as any).paused = false;
        return Promise.resolve();
      };
      (HTMLMediaElement.prototype as any).pause = function () {
        (this as any).paused = true;
      };
    });

    await page.goto("/");
    await expect(page.locator("#title")).toContainText("Album 1");

    // First next: move to Album 2 and trigger page=2 fetch
    await page.keyboard.press("e");
    await expect(page.locator("#title")).toContainText("Album 2");

    // Second next: page 2 is appended → Album 3
    await page.keyboard.press("e");
    await expect(page.locator("#title")).toContainText("Album 3");
  });

  test("URL state persistence across reloads", async ({ page }) => {
    await page.route("**/api/albums**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(page1),
      }),
    );

    await page.goto("/");

    await page.locator("#hot-btn").click();

    await page.locator("#genre-search").click();
    await page.locator("#genre-search").fill("electronic");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/genre=electronic/);

    await page.reload();

    await expect(page.locator("#genre-search")).toHaveValue("electronic");
    await expect(page.locator("#hot-btn")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
