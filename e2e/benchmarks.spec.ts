import { test, expect } from '@playwright/test';

test.describe('Benchmarks and File Type Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should navigate to benchmarks page', async ({ page }) => {
    // Click benchmarks link in dev nav
    await page.click('nav.dev-nav a:has-text("Benchmarks")');
    await expect(page).toHaveURL(/\/benchmark$/);
    await expect(page.locator('h2')).toHaveText('Testing & Benchmarks');
  });

  test('should have performance and file type tabs', async ({ page }) => {
    await page.goto('http://localhost:3000/benchmark');
    
    // Check tabs exist
    await expect(page.locator('button.tab:has-text("Performance Benchmarks")')).toBeVisible();
    await expect(page.locator('button.tab:has-text("File Type Tests")')).toBeVisible();
    
    // Performance tab should be active by default
    await expect(page.locator('button.tab.active')).toHaveText('Performance Benchmarks');
  });

  test('should run performance benchmarks', async ({ page }) => {
    await page.goto('http://localhost:3000/benchmark');
    
    // Click run benchmarks
    await page.click('button:has-text("Run Benchmarks")');
    
    // Should show running state
    await expect(page.locator('button:has-text("Running Tests...")')).toBeVisible();
    
    // Wait for some results (with timeout)
    await expect(page.locator('.benchmark-logs')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=Starting crypto performance benchmarks')).toBeVisible();
    
    // Should eventually show results
    await expect(page.locator('.benchmark-results')).toBeVisible({ timeout: 60000 });
  });

  test('should switch to file type tests', async ({ page }) => {
    await page.goto('http://localhost:3000/benchmark');
    
    // Click file type tests tab
    await page.click('button.tab:has-text("File Type Tests")');
    
    // Tab should be active
    await expect(page.locator('button.tab.active')).toHaveText('File Type Tests');
    
    // Info should update
    await expect(page.locator('text=Test encryption and decryption with various file types')).toBeVisible();
    
    // Button text should change
    await expect(page.locator('button.primary')).toHaveText('Run File Type Tests');
  });

  test('should run file type tests', async ({ page }) => {
    await page.goto('http://localhost:3000/benchmark');
    
    // Switch to file type tests
    await page.click('button.tab:has-text("File Type Tests")');
    
    // Run tests
    await page.click('button:has-text("Run File Type Tests")');
    
    // Should show running state
    await expect(page.locator('button:has-text("Running Tests...")')).toBeVisible();
    
    // Wait for results
    await expect(page.locator('text=Starting file type compatibility tests')).toBeVisible({ timeout: 30000 });
    
    // Should show test results
    await expect(page.locator('text=TEST SUMMARY')).toBeVisible({ timeout: 60000 });
  });
});