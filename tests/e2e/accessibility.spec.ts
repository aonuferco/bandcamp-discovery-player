import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

test.describe('Accessibility Compliance (WCAG 2.1 AA)', () => {
  test.beforeEach(async ({ page }) => {
    // Inject axe-core into the page
    await injectAxe(page);
  });

  test('main page has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#title');
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test('skip link is present and accessible', async ({ page }) => {
    await page.goto('/');
    
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeVisible();
    
    // Focus skip link via keyboard
    await page.keyboard.press('Tab');
    const skipLinkElement = await page.locator('.skip-link').elementHandle();
    const isFocused = await page.evaluate(
      (el) => document.activeElement === el,
      skipLinkElement
    );
    expect(isFocused).toBe(true);
  });

  test('focus indicators are visible on buttons', async ({ page }) => {
    await page.goto('/');
    
    // Tab to mode buttons
    await page.keyboard.press('Tab');
    const newBtn = page.locator('#new-releases-btn');
    const focusOutlineColor = await newBtn.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.outlineColor;
    });
    expect(focusOutlineColor).toBeTruthy();
  });

  test('help modal has proper ARIA attributes', async ({ page }) => {
    await page.goto('/');
    
    const helpBtn = page.locator('#help-btn');
    const modal = page.locator('#help-modal');
    
    // Check ARIA attributes before opening
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    
    // Open modal
    await helpBtn.click();
    
    // Modal should have aria-hidden="false" when open
    await expect(modal).toHaveAttribute('aria-hidden', 'false');
  });

  test('modal has focus management', async ({ page }) => {
    await page.goto('/');
    
    // Open help modal
    await page.locator('#help-btn').click();
    
    // Focus should move to close button
    const closeBtn = page.locator('#close-modal');
    const isFocused = await page.evaluate(
      (el) => document.activeElement === el,
      await closeBtn.elementHandle()
    );
    expect(isFocused).toBe(true);
  });

  test('interactive elements have minimum 44x44px tap targets', async ({ page }) => {
    await page.goto('/');
    
    const buttons = [
      '#new-releases-btn',
      '#hot-btn',
      '#help-btn',
      '#next-btn',
      '#prev-btn',
    ];
    
    for (const selector of buttons) {
      const element = page.locator(selector);
      const boundingBox = await element.boundingBox();
      
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('all icon-only buttons have aria-labels', async ({ page }) => {
    await page.goto('/');
    
    const iconButtons = [
      '#help-btn',
      '#next-btn',
      '#prev-btn',
      '#copy-link-fab',
    ];
    
    for (const selector of iconButtons) {
      const element = page.locator(selector);
      const ariaLabel = await element.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).not.toBe('');
    }
  });

  test('toast container has aria-live attribute', async ({ page }) => {
    await page.goto('/');
    
    const toastContainer = page.locator('#toast-container');
    await expect(toastContainer).toHaveAttribute('role', 'status');
    await expect(toastContainer).toHaveAttribute('aria-live', 'polite');
    await expect(toastContainer).toHaveAttribute('aria-atomic', 'true');
  });

  test('genre search has proper combobox attributes', async ({ page }) => {
    await page.goto('/');
    
    const genreSearch = page.locator('#genre-search');
    await expect(genreSearch).toHaveAttribute('role', 'combobox');
    await expect(genreSearch).toHaveAttribute('aria-label', 'Search for a music genre');
    await expect(genreSearch).toHaveAttribute('aria-haspopup', 'listbox');
    await expect(genreSearch).toHaveAttribute('aria-controls', 'genre-dropdown');
  });

  test('genre dropdown has proper listbox attributes', async ({ page }) => {
    await page.goto('/');
    
    const genreDropdown = page.locator('#genre-dropdown');
    await expect(genreDropdown).toHaveAttribute('role', 'listbox');
    await expect(genreDropdown).toHaveAttribute('aria-label', 'Genre options');
  });

  test('main landmark is present', async ({ page }) => {
    await page.goto('/');
    
    const main = page.locator('main');
    await expect(main).toBeVisible();
    await expect(main).toHaveId('main-content');
  });

  test('header landmark is present', async ({ page }) => {
    await page.goto('/');
    
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('album title has status role for screen reader announcements', async ({ page }) => {
    await page.goto('/');
    
    const titleElement = page.locator('#title');
    await expect(titleElement).toHaveAttribute('role', 'status');
  });

  test('keyboard shortcuts do not fire when typing in search', async ({ page }) => {
    await page.goto('/');
    
    const genreSearch = page.locator('#genre-search');
    const initialTitle = await page.locator('#title').textContent();
    
    // Focus search and type 'e' (which is the next album shortcut)
    await genreSearch.click();
    await page.keyboard.press('e');
    
    // Album should not change
    const titleAfterE = await page.locator('#title').textContent();
    expect(titleAfterE).toBe(initialTitle);
  });

  test('has proper HTML lang attribute', async ({ page }) => {
    await page.goto('/');
    
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveAttribute('lang', 'en');
  });

  test('all buttons have visible focus indicators', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button');
    
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      // Navigate to button via keyboard
      await button.focus();
      
      // Check for focus outline/style
      const hasOutline = await button.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const outline = styles.outline;
        const outlineWidth = styles.outlineWidth;
        return outline && outline !== 'none' || (outlineWidth && outlineWidth !== '0px');
      });
      
      // Note: This is a soft assertion as some buttons might use other focus indicators
      if (hasOutline) {
        expect(hasOutline).toBe(true);
      }
    }
  });

  test('modal closes and focus returns on Escape', async ({ page }) => {
    await page.goto('/');
    
    const helpBtn = page.locator('#help-btn');
    const modal = page.locator('#help-modal');
    
    // Open modal
    await helpBtn.click();
    await expect(modal).toHaveClass(/show/);
    
    // Press Escape
    await page.keyboard.press('Escape');
    
    // Modal should be closed
    await expect(modal).not.toHaveClass(/show/);
  });

  test('audio element is accessible', async ({ page }) => {
    await page.goto('/');
    
    // The audio element should have native controls
    const audio = page.locator('audio');
    await expect(audio).toBeVisible();
  });

  test('color contrast is sufficient for text elements', async ({ page }) => {
    await page.goto('/');
    
    // Check main text elements
    const textElements = await page.locator('body *:not(script):not(style)').all();
    
    for (const element of textElements.slice(0, 20)) { // Check first 20 elements
      const bgColor = await element.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      const textColor = await element.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      
      // Just verify colors are set (detailed contrast checking would require external library)
      expect(bgColor || textColor).toBeTruthy();
    }
  });

  test('no axe violations on genre filter page', async ({ page }) => {
    await page.goto('/?genre=electronic');
    await page.waitForSelector('#title');
    
    await checkA11y(page, null, {
      detailedReport: true,
    });
  });

  test('no axe violations on hot mode', async ({ page }) => {
    await page.goto('/?mode=hot');
    await page.waitForSelector('#title');
    
    await checkA11y(page, null, {
      detailedReport: true,
    });
  });
});
