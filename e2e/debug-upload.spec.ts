import { test, expect } from '@playwright/test';

const TEST_PASSWORD = 'TestPassword123!@#$';

test('debug upload flow', async ({ page }) => {
  // Collect console messages
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });
  
  // Navigate to upload
  await page.goto('http://localhost:3000/upload');
  
  // Wait a bit
  await page.waitForTimeout(1000);
  
  // Fill in the form
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.click('input[type="file"]');
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles([{
    name: 'test.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Test content'),
  }]);
  
  await page.fill('input#password', TEST_PASSWORD);
  await page.fill('input#confirm-password', TEST_PASSWORD);
  
  // Click upload
  await page.click('button:has-text("Encrypt and Upload")');
  
  // Wait for any error
  await page.waitForTimeout(5000);
  
  // Log console messages
  console.log('Console messages:', consoleMessages);
  
  // Check for error
  const errorText = await page.locator('.error').textContent();
  console.log('Error text:', errorText);
  
  // Take screenshot
  await page.screenshot({ path: 'upload-debug.png' });
});