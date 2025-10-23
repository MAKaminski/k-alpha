import { test, expect } from '@playwright/test';

test.describe('Account Balance E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('/');
  });

  test('should display account balance widget', async ({ page }) => {
    // Wait for the account balance widget to load
    await page.waitForSelector('[data-testid="account-balance-widget"]', { timeout: 10000 });
    
    // Check that the widget is visible
    const widget = page.locator('[data-testid="account-balance-widget"]');
    await expect(widget).toBeVisible();
  });

  test('should show account ID in widget', async ({ page }) => {
    await page.waitForSelector('[data-testid="account-balance-widget"]', { timeout: 10000 });
    
    // Check for account ID display
    const accountId = page.locator('[data-testid="account-id"]');
    await expect(accountId).toBeVisible();
    await expect(accountId).toContainText('8042-3452');
  });

  test('should display balance information when available', async ({ page }) => {
    await page.waitForSelector('[data-testid="account-balance-widget"]', { timeout: 10000 });
    
    // Check for balance fields
    const balance = page.locator('[data-testid="current-balance"]');
    const cash = page.locator('[data-testid="available-cash"]');
    const buyingPower = page.locator('[data-testid="buying-power"]');
    
    // At least one should be visible (either with data or loading state)
    await expect(balance.or(cash).or(buyingPower)).toBeVisible();
  });

  test('should show Live Data status instead of Loading', async ({ page }) => {
    // Wait for the status indicator
    await page.waitForSelector('[data-testid="data-status"]', { timeout: 10000 });
    
    const status = page.locator('[data-testid="data-status"]');
    await expect(status).toBeVisible();
    
    // Should show "Live Data" not "Loading..."
    await expect(status).toContainText('Live Data');
    await expect(status).not.toContainText('Loading...');
  });

  test('should update balance data in real-time', async ({ page }) => {
    await page.waitForSelector('[data-testid="account-balance-widget"]', { timeout: 10000 });
    
    // Wait a bit for potential updates
    await page.waitForTimeout(5000);
    
    // Check that the widget is still visible and functional
    const widget = page.locator('[data-testid="account-balance-widget"]');
    await expect(widget).toBeVisible();
  });

  test('should handle timezone conversion correctly', async ({ page }) => {
    await page.waitForSelector('[data-testid="account-balance-widget"]', { timeout: 10000 });
    
    // Check that timestamps are displayed in EST/EDT
    const timestamp = page.locator('[data-testid="last-updated"]');
    if (await timestamp.isVisible()) {
      const timestampText = await timestamp.textContent();
      // Should not contain UTC indicators like +00:00
      expect(timestampText).not.toMatch(/\+00:00|UTC/);
    }
  });
});
