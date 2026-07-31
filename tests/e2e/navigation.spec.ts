import { test, expect } from '@playwright/test';

const page1 = [
  { title: 'Album 1', artist: 'A', img: '/img/a.jpg', stream_url: 'https://example.com/a.mp3', link: 'https://a.bandcamp.com' },
  { title: 'Album 2', artist: 'B', img: '/img/b.jpg', stream_url: 'https://example.com/b.mp3', link: 'https://b.bandcamp.com' }
];

const page2 = [
  { title: 'Album 3', artist: 'C', img: '/img/c.jpg', stream_url: 'https://example.com/c.mp3', link: 'https://c.bandcamp.com' }
];

test.describe('Navigation & URL state', () => {
  test('pagination loads more albums when approaching end', async ({ page }) => {
    // Return page1 for page=1 and page2 for page=2
    await page.route('**/api/albums**', (route) => {
      const url = route.request().url();
      if (url.includes('page=2')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(page2) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(page1) });
      }
    });

    // Prevent real audio playback
    await page.addInitScript(() => {
      (HTMLMediaElement.prototype as any).play = async function () { (this as any).paused = false; return Promise.resolve(); };
      (HTMLMediaElement.prototype as any).pause = function () { (this as any).paused = true; };
    });

    await page.goto('/');

    // Move forward repeatedly to trigger pagination
    const initialTitle = await page.locator('#title').textContent();
    // press 'e' enough times to pass threshold
    await page.keyboard.press('e');
    await page.keyboard.press('e');
    await page.keyboard.press('e');

    // wait for fetch and next page to be appended
    await page.waitForTimeout(600);

    const seen = await page.locator('#title').textContent();
    expect(seen).not.toBe(initialTitle);
    expect(seen).toContain('Album 3');
  });

  test('URL state persistence across reloads', async ({ page }) => {
    await page.route('**/api/albums**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(page1) }));

    await page.goto('/');

    // Switch mode to hot
    await page.locator('#hot-btn').click();

    // Select a genre via input
    await page.locator('#genre-search').click();
    await page.locator('#genre-search').fill('electronic');
    await page.keyboard.press('Enter');

    // Wait for URL to be updated
    await page.waitForTimeout(300);

    const urlBefore = page.url();
    expect(urlBefore).toContain('genre=electronic');

    // Reload and ensure state persists
    await page.reload();
    await page.waitForTimeout(300);

    await expect(page.locator('#genre-search')).toHaveValue('electronic');
    await expect(page.locator('#hot-btn')).toHaveAttribute('aria-pressed', 'true');
  });
});
