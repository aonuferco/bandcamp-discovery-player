import { test, expect } from '@playwright/test';

const pageData = [
  { title: 'Responsive Album', artist: 'R', img: '/img/r.jpg', stream_url: 'https://example.com/r.mp3', link: 'https://r.bandcamp.com' }
];

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
];

for (const vp of viewports) {
  test.describe(`layout at ${vp.name}`, () => {
    test(`renders cover and title at ${vp.name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      await page.route('**/api/albums**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pageData) }));
      await page.goto('/');

      await expect(page.locator('#cover')).toBeVisible();
      await expect(page.locator('#title')).toBeVisible();

      // On mobile we expect a single-column layout (cover stacked)
      if (vp.name === 'mobile') {
        const coverBox = await page.locator('#cover').boundingBox();
        const titleBox = await page.locator('#title').boundingBox();
        // title should appear below cover (y greater)
        if (coverBox && titleBox) {
          expect(titleBox.y).toBeGreaterThan(coverBox.y);
        }
      }
    });
  });
}
