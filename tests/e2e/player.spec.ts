import { test, expect } from '@playwright/test';

test.describe('Bandcamp Discovery Player', () => {
  test('loads and displays album', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#cover')).toBeVisible();
    await expect(page.locator('#title')).not.toBeEmpty();
  });

  test('keyboard navigation (E/Q)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#title');
    const firstTitle = await page.locator('#title').textContent();
    
    await page.keyboard.press('e');
    await page.waitForTimeout(1000);
    
    const secondTitle = await page.locator('#title').textContent();
    expect(secondTitle).not.toBe(firstTitle);
  });

  test('genre URL param round-trip', async ({ page }) => {
    await page.goto('/?genre=electronic&mode=hot');
    await expect(page.locator('#title')).not.toBeEmpty();

    // Assert the hot button has aria-pressed="true"
    const hotBtn = page.locator('#hot-btn');
    await expect(hotBtn).toHaveAttribute('aria-pressed', 'true');

    // Assert the genre search input value is "electronic"
    const genreSearch = page.locator('#genre-search');
    await expect(genreSearch).toHaveValue('electronic');

    // Press E and assert the album title changes
    const firstTitle = await page.locator('#title').textContent();
    await page.keyboard.press('e');
    await page.waitForTimeout(1000);
    
    const secondTitle = await page.locator('#title').textContent();
    expect(secondTitle).not.toBe(firstTitle);
  });

  test('genre search filters dropdown', async ({ page }) => {
    await page.goto('/');
    await page.locator('#genre-search').click();
    await page.locator('#genre-search').fill('break');
    await expect(page.locator('.genre-item:not(.genre-item-all)').first()).toContainText('breakcore');
  });

  test('genre dropdown keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.locator('#genre-search').focus();
    await page.locator('#genre-search').fill('rock');
    
    // Press ArrowDown twice to select the first matched actual genre (skipping All Genres)
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.genre-item.highlighted')).toBeVisible();
    const highlightedText = await page.locator('.genre-item.highlighted').textContent();
    
    // Press Enter to select
    await page.keyboard.press('Enter');
    
    // Should update URL and input
    await expect(page).toHaveURL(new RegExp(`genre=${highlightedText}`));
    await expect(page.locator('#genre-search')).toHaveValue(highlightedText!);
  });

  test('mode toggle updates URL', async ({ page }) => {
    await page.goto('/');
    await page.locator('#hot-btn').click();
    await expect(page).toHaveURL(/mode=hot/);
    await expect(page.locator('#hot-btn')).toHaveClass(/active/);
  });

  test('help modal opens and closes', async ({ page }) => {
    await page.goto('/');
    await page.locator('#help-btn').click();
    await expect(page.locator('#help-modal')).toHaveClass(/show/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#help-modal')).not.toHaveClass(/show/);
  });
});
