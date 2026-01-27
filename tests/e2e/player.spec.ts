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

  test('genre search filters dropdown', async ({ page }) => {
    await page.goto('/');
    await page.locator('#genre-search').click();
    await page.locator('#genre-search').fill('break');
    await expect(page.locator('.genre-item').first()).toContainText('breakcore');
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
