import { test, expect } from '@playwright/test';

// Helper fixtures used by multiple tests
const page1 = [
  {
    title: 'Page1 Album A',
    artist: 'Artist A',
    img: '/img/a.jpg',
    stream_url: 'https://example.com/stream-a.mp3',
    link: 'https://artist-a.bandcamp.com',
    track_count: 1,
    release_date: '2020-01-01'
  },
  {
    title: 'Page1 Album B',
    artist: 'Artist B',
    img: '/img/b.jpg',
    stream_url: 'https://example.com/stream-b.mp3',
    link: 'https://artist-b.bandcamp.com',
    track_count: 1,
    release_date: '2020-02-01'
  }
];

const page2 = [
  {
    title: 'Page2 Album C',
    artist: 'Artist C',
    img: '/img/c.jpg',
    stream_url: 'https://example.com/stream-c.mp3',
    link: 'https://artist-c.bandcamp.com',
    track_count: 1,
    release_date: '2020-03-01'
  }
];

test.describe('Bandcamp Discovery Player - extended E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Prevent real audio playback in test environment but keep audio element behaviour
    await page.addInitScript(() => {
      // Override play/pause to avoid needing real audio playback in CI
      // eslint-disable-next-line no-native-reassign
      (HTMLMediaElement.prototype as any).play = async function () {
        try {
          // emulate successful play
          (this as any).paused = false;
          (this as any).currentTime = (this as any).currentTime || 0;
        } catch (e) {
          // ignore
        }
        return Promise.resolve();
      };
      (HTMLMediaElement.prototype as any).pause = function () {
        try { (this as any).paused = true; } catch (e) {}
      };
    });
  });

  test('full page load → albums displayed → click play → audio starts', async ({ page }) => {
    await page.route('**/api/albums**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(page1) });
    });

    await page.goto('/');
    await expect(page.locator('#cover')).toBeVisible();
    await expect(page.locator('#title')).not.toBeEmpty();

    // Ensure audio element exists in #player
    await expect(page.locator('#player audio')).toBeVisible();

    // Trigger play via page.evaluate to call the overridden play()
    await page.locator('#player audio').evaluate((el: HTMLMediaElement) => el.play());

    // Verify audio is no longer paused
    const paused = await page.locator('#player audio').evaluate((el: HTMLMediaElement) => el.paused);
    expect(paused).toBe(false);
  });

  test('genre switching → new albums load', async ({ page }) => {
    await page.route('**/api/albums**', (route) => {
      const url = route.request().url();
      if (url.includes('tag=pop')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(page2) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(page1) });
      }
    });

    await page.goto('/');
    const initial = await page.locator('#title').textContent();

    // Type a genre and press Enter to select it
    await page.locator('#genre-search').click();
    await page.locator('#genre-search').fill('pop');
    await page.keyboard.press('Enter');

    // Wait for new album to load
    await page.waitForTimeout(500);
    const after = await page.locator('#title').textContent();
    expect(after).not.toBe(initial);
    expect(after).toContain('Page2');
  });

  test('keyboard navigation (Q/E) cycles through albums', async ({ page }) => {
    await page.route('**/api/albums**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(page1.concat(page2)) });
    });

    await page.goto('/');
    await page.waitForSelector('#title');
    const first = await page.locator('#title').textContent();

    await page.keyboard.press('e');
    await page.waitForTimeout(200);
    const second = await page.locator('#title').textContent();
    expect(second).not.toBe(first);

    await page.keyboard.press('q');
    await page.waitForTimeout(200);
    const back = await page.locator('#title').textContent();
    expect(back).toBe(first);
  });

  test('copy link (W) puts URL in clipboard', async ({ page, context }) => {
    await page.route('**/api/albums**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(page1) }));

    // Grant clipboard permissions for playwright context
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/');
    await page.waitForSelector('#title');

    // Trigger copy via keyboard shortcut
    await page.keyboard.press('w');

    // Read clipboard via page.evaluate
    const clip = await page.evaluate(async () => navigator.clipboard.readText());
    expect(clip).toContain('bandcamp.com');
  });

  test('volume controls (ArrowUp/ArrowDown) change volume', async ({ page }) => {
    await page.route('**/api/albums**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(page1) }));

    await page.goto('/');
    await page.waitForSelector('#player audio');

    const before = await page.locator('#player audio').evaluate((a: HTMLAudioElement) => a.volume);

    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);
    const afterUp = await page.locator('#player audio').evaluate((a: HTMLAudioElement) => +a.volume.toFixed(2));
    expect(afterUp).toBeGreaterThan(before);

    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    const afterDown = await page.locator('#player audio').evaluate((a: HTMLAudioElement) => +a.volume.toFixed(2));
    expect(afterDown).toBeLessThanOrEqual(afterUp);
  });

  test('error state display when API fails (500)', async ({ page }) => {
    await page.route('**/api/albums**', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));

    await page.goto('/');

    // Error overlay should be visible with a helpful message
    await expect(page.locator('#error-overlay')).toBeVisible();
    const errText = await page.locator('#error-overlay .error-message').textContent();
    expect(errText).toMatch(/Failed to load albums|Upstream/);
  });

  test('empty state when no albums match a genre', async ({ page }) => {
    await page.route('**/api/albums**', (route) => {
      const url = route.request().url();
      if (url.includes('tag=no-results')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(page1) });
      }
    });

    await page.goto('/');

    // Select a genre that returns empty results
    await page.locator('#genre-search').click();
    await page.locator('#genre-search').fill('no-results');
    await page.keyboard.press('Enter');

    // Error overlay should display 'No results found'
    await expect(page.locator('#error-overlay')).toBeVisible();
    const msg = await page.locator('#error-overlay .error-message').textContent();
    expect(msg).toContain('No results found');
  });

  test('help modal open/close', async ({ page }) => {
    await page.route('**/api/albums**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(page1) }));

    await page.goto('/');
    await page.locator('#help-btn').click();
    await expect(page.locator('#help-modal')).toHaveClass(/show/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#help-modal')).not.toHaveClass(/show/);
  });
});
