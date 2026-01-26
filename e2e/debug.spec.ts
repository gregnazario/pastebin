import { test, expect } from '@playwright/test';

test('debug app loading', async ({ page }) => {
  // Collect console messages
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });
  
  // Navigate
  await page.goto('http://localhost:3000');
  
  // Wait a bit for any async errors
  await page.waitForTimeout(2000);
  
  // Log console messages
  console.log('Console messages:', consoleMessages);
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-screenshot.png' });
  
  // Check page title
  await expect(page).toHaveTitle('Secure Pastebin');
  
  // Log page content
  const content = await page.content();
  console.log('Page content length:', content.length);
  
  // Check if React root exists
  const root = await page.locator('#root');
  await expect(root).toBeVisible();
  
  // Check for any error messages
  const errors = await page.locator('.error').count();
  console.log('Error elements found:', errors);
  
  // Check for main content
  const h1 = await page.locator('h1').first();
  const h1Text = await h1.textContent();
  console.log('H1 text:', h1Text);
  
  // Check for navigation links
  const uploadLink = await page.locator('a:has-text("Upload")').count();
  console.log('Upload links found:', uploadLink);
});