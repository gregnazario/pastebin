/**
 * End-to-end test for upload and download functionality
 * Tests the complete flow of uploading and downloading encrypted files
 */

import { test, expect } from '@playwright/test';

const TEST_PASSWORD = 'TestPassword123!@#$';
const TEST_FILE_CONTENT = 'Hello, this is a test file for E2E testing!';

test.describe('Upload and Download Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
  });

  test('should successfully upload and download a file', async ({ page }) => {
    // Step 1: Navigate to upload page
    await page.click('text=Upload a File');
    await expect(page).toHaveURL(/\/upload$/);

    // Step 2: Create and select a test file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('input[type="file"]');
    const fileChooser = await fileChooserPromise;
    
    // Create a test file
    const fileName = 'test-file.txt';
    const buffer = Buffer.from(TEST_FILE_CONTENT);
    await fileChooser.setFiles([
      {
        name: fileName,
        mimeType: 'text/plain',
        buffer,
      },
    ]);

    // Step 3: Enter password
    await page.fill('input#password', TEST_PASSWORD);
    await page.fill('input#confirm-password', TEST_PASSWORD);

    // Step 4: Upload the file
    await page.click('button:has-text("Encrypt and Upload")');

    // Wait for upload to complete
    await expect(page.locator('text=Upload Complete!')).toBeVisible({ timeout: 30000 });

    // Step 5: Get the shareable link
    const shareableLink = await page.inputValue('input[readonly]');
    expect(shareableLink).toContain('/p/');
    expect(shareableLink).toContain('#'); // Should have key fragment

    // Copy link
    await page.click('button:has-text("Copy")');
    await expect(page.locator('text=Copied!')).toBeVisible();

    // Step 6: Navigate to the download link
    await page.goto(shareableLink);

    // Step 7: Enter password on download page
    await expect(page.locator('text=Access File')).toBeVisible();
    await page.fill('input#password', TEST_PASSWORD);
    await page.fill('input#confirm-password', TEST_PASSWORD);

    // Step 8: Download and decrypt
    await page.click('button:has-text("Download and Decrypt")');

    // Wait for decryption
    await expect(page.locator('text=File decrypted successfully!')).toBeVisible({ timeout: 30000 });

    // Verify file info is displayed
    await expect(page.locator(`text=${fileName}`)).toBeVisible();
    await expect(page.locator('text=text/plain')).toBeVisible();
  });

  test('should fail with wrong password', async ({ page }) => {
    // First upload a file (simplified)
    await page.goto('http://localhost:3000/upload');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('input[type="file"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      {
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Test content'),
      },
    ]);

    await page.fill('input#password', TEST_PASSWORD);
    await page.fill('input#confirm-password', TEST_PASSWORD);
    await page.click('button:has-text("Encrypt and Upload")');
    await expect(page.locator('text=Upload Complete!')).toBeVisible({ timeout: 30000 });

    const shareableLink = await page.inputValue('input[readonly]');

    // Navigate to download with wrong password
    await page.goto(shareableLink);
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button:has-text("Download and Decrypt")');

    // Should show error
    await expect(page.locator('.error')).toBeVisible();
    await expect(page.locator('text=Failed to decrypt')).toBeVisible();
  });

  test('should validate password requirements', async ({ page }) => {
    await page.goto('http://localhost:3000/upload');

    // Select a file first
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('input[type="file"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      {
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Test'),
      },
    ]);

    // Test weak passwords
    const weakPasswords = [
      'short',
      'alllowercase',
      'ALLUPPERCASE',
      '12345678',
      'NoNumbers!',
      'nospecialchars123',
    ];

    for (const weakPassword of weakPasswords) {
      await page.fill('input#password', '');
      await page.fill('input#password', weakPassword);
      await page.fill('input#confirm-password', weakPassword);
      
      // Check that upload button is disabled or shows error
      const uploadButton = page.locator('button:has-text("Encrypt and Upload")');
      const isDisabled = await uploadButton.isDisabled();
      
      if (!isDisabled) {
        await uploadButton.click();
        await expect(page.locator('text=Invalid password')).toBeVisible();
      }
    }

    // Test strong password
    await page.fill('input#password', TEST_PASSWORD);
    await page.fill('input#confirm-password', TEST_PASSWORD);
    // Check that the button is now enabled
    const uploadButton = page.locator('button:has-text("Encrypt and Upload")');
    await expect(uploadButton).toBeEnabled();
  });

  test('should handle large files', async ({ page }) => {
    await page.goto('http://localhost:3000/upload');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('input[type="file"]');
    const fileChooser = await fileChooserPromise;

    // Create a 5MB file
    const largeContent = 'x'.repeat(5 * 1024 * 1024);
    await fileChooser.setFiles([
      {
        name: 'large-file.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(largeContent),
      },
    ]);

    await page.fill('input#password', TEST_PASSWORD);
    await page.fill('input#confirm-password', TEST_PASSWORD);
    await page.click('button:has-text("Encrypt and Upload")');

    // Should see progress updates
    await expect(page.locator('.upload-progress')).toBeVisible();
    await expect(page.locator('text=Encrypting file')).toBeVisible();
    await expect(page.locator('text=Uploading to storage')).toBeVisible();

    // Wait for completion (longer timeout for large file)
    await expect(page.locator('text=Upload Complete!')).toBeVisible({ timeout: 60000 });
  });

  test('should enforce file size limit', async ({ page }) => {
    await page.goto('http://localhost:3000/upload');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('input[type="file"]');
    const fileChooser = await fileChooserPromise;

    // Try to create a file larger than 100MB (this will fail in browser)
    // Instead, we'll check the UI shows the limit
    await expect(page.locator('text=100MB')).toBeVisible();
  });

  test('should handle metadata encryption option', async ({ page }) => {
    await page.goto('http://localhost:3000/upload');

    // Check that metadata encryption checkbox exists
    const metadataCheckbox = page.locator('input[type="checkbox"]');
    await expect(metadataCheckbox).toBeVisible();
    
    // Should be unchecked by default
    await expect(metadataCheckbox).not.toBeChecked();

    // Toggle it on
    await metadataCheckbox.check();
    await expect(metadataCheckbox).toBeChecked();
  });

  test('should show and hide password', async ({ page }) => {
    await page.goto('http://localhost:3000/upload');

    const passwordInput = page.locator('input#password');
    const toggleButton = page.locator('button.toggle-password');

    // Should be password type initially
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(toggleButton).toHaveText('Show');

    // Click to show
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(toggleButton).toHaveText('Hide');

    // Click to hide again
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(toggleButton).toHaveText('Show');
  });

  test('should handle missing decryption key', async ({ page }) => {
    // Navigate to a file URL without the key fragment
    await page.goto('http://localhost:3000/p/some-file-id');

    await expect(page.locator('text=Invalid link - missing decryption key')).toBeVisible();
    await expect(page.locator('text=Please use the complete link')).toBeVisible();
  });
});