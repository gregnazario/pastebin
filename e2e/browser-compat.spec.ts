import { test, expect, devices } from '@playwright/test';

/**
 * Browser compatibility tests
 * Tests core functionality across different browsers and devices
 */

const TEST_PASSWORD = 'BrowserTest123!@#$';

// Test on different browser engines
['chromium', 'firefox', 'webkit'].forEach(browserName => {
  test.describe(`Browser Compatibility - ${browserName}`, () => {
    test('should load homepage correctly', async ({ page }) => {
      await page.goto('http://localhost:3000');
      
      // Check basic elements
      await expect(page.locator('h1')).toHaveText('Secure Pastebin');
      await expect(page.locator('text=Upload a File')).toBeVisible();
      
      // Check styling loaded
      const header = page.locator('header');
      const bgColor = await header.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      expect(bgColor).toBe('rgb(44, 62, 80)'); // #2c3e50
    });

    test('should navigate between pages', async ({ page }) => {
      await page.goto('http://localhost:3000');
      
      // Navigate to upload
      await page.click('text=Upload a File');
      await expect(page).toHaveURL(/\/upload$/);
      await expect(page.locator('h2')).toHaveText('Upload File');
      
      // Go back home
      await page.goto('http://localhost:3000');
      await expect(page.locator('h2')).toHaveText('Welcome to Secure Pastebin');
    });

    test('should handle file selection', async ({ page }) => {
      await page.goto('http://localhost:3000/upload');
      
      // Select a file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.click('input[type="file"]');
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([{
        name: `test-${browserName}.txt`,
        mimeType: 'text/plain',
        buffer: Buffer.from('Browser compatibility test'),
      }]);
      
      // Should show file info
      await expect(page.locator('.file-info')).toContainText(`test-${browserName}.txt`);
    });

    test('should validate passwords', async ({ page }) => {
      await page.goto('http://localhost:3000/upload');
      
      // Test weak password
      await page.fill('input#password', 'weak');
      await page.fill('input#confirm-password', 'weak');
      
      // Should show error
      await expect(page.locator('.password-errors')).toBeVisible();
      
      // Test strong password
      await page.fill('input#password', TEST_PASSWORD);
      await page.fill('input#confirm-password', TEST_PASSWORD);
      
      // Errors should be gone
      await expect(page.locator('.password-errors')).not.toBeVisible();
    });

    test('should toggle password visibility', async ({ page }) => {
      await page.goto('http://localhost:3000/upload');
      
      const passwordInput = page.locator('input#password');
      const toggleButton = page.locator('button.toggle-password');
      
      // Should be password type initially
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Toggle to show
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      
      // Toggle back
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should handle view page with missing key', async ({ page }) => {
      await page.goto('http://localhost:3000/p/test-file-id');
      
      // Should show error about missing key
      await expect(page.locator('text=Invalid link - missing decryption key')).toBeVisible();
    });
  });
});

// Mobile device tests
const mobileDevices = [
  { name: 'iPhone 12', device: devices['iPhone 12'] },
  { name: 'Pixel 5', device: devices['Pixel 5'] },
  { name: 'iPad', device: devices['iPad (gen 7)'] },
];

mobileDevices.forEach(({ name, device }) => {
  test.describe(`Mobile Compatibility - ${name}`, () => {
    test.use(device);

    test('should be responsive on mobile', async ({ page }) => {
      await page.goto('http://localhost:3000');
      
      // Check viewport
      const viewportSize = page.viewportSize();
      expect(viewportSize).toBeDefined();
      
      // Main content should be visible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('text=Upload a File')).toBeVisible();
      
      // Check main container width
      const main = page.locator('main');
      const box = await main.boundingBox();
      expect(box).toBeDefined();
      if (box && viewportSize) {
        expect(box.width).toBeLessThanOrEqual(viewportSize.width);
      }
    });

    test('should handle file upload on mobile', async ({ page }) => {
      await page.goto('http://localhost:3000/upload');
      
      // All form elements should be accessible
      await expect(page.locator('input[type="file"]')).toBeVisible();
      await expect(page.locator('input#password')).toBeVisible();
      await expect(page.locator('input#confirm-password')).toBeVisible();
      await expect(page.locator('button:has-text("Encrypt and Upload")')).toBeVisible();
    });
  });
});

// Feature detection tests
test.describe('Feature Detection', () => {
  test('should support required Web APIs', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const supportedAPIs = await page.evaluate(() => {
      return {
        crypto: typeof window.crypto !== 'undefined',
        subtle: typeof window.crypto?.subtle !== 'undefined',
        getRandomValues: typeof window.crypto?.getRandomValues === 'function',
        fileReader: typeof FileReader !== 'undefined',
        blob: typeof Blob !== 'undefined',
        uint8Array: typeof Uint8Array !== 'undefined',
        textEncoder: typeof TextEncoder !== 'undefined',
        textDecoder: typeof TextDecoder !== 'undefined',
        promise: typeof Promise !== 'undefined',
        fetch: typeof fetch === 'function',
        localStorage: typeof localStorage !== 'undefined',
        clipboard: typeof navigator?.clipboard !== 'undefined',
      };
    });

    // All required APIs should be available
    Object.entries(supportedAPIs).forEach(([api, supported]) => {
      expect(supported).toBe(true);
    });
  });

  test('should handle clipboard API', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    await page.goto('http://localhost:3000');
    
    const canWriteClipboard = await page.evaluate(async () => {
      try {
        await navigator.clipboard.writeText('test');
        return true;
      } catch {
        return false;
      }
    });
    
    expect(canWriteClipboard).toBe(true);
  });
});

// Performance tests
test.describe('Performance', () => {
  test('should load quickly', async ({ page }) => {
    const startTime = Date.now();
    
    const response = await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle',
    });
    
    const loadTime = Date.now() - startTime;
    
    expect(response?.status()).toBe(200);
    expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds
  });

  test('should not have memory leaks during file operations', async ({ page }) => {
    await page.goto('http://localhost:3000/upload');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });
    
    if (initialMemory !== null) {
      // Perform multiple file selections
      for (let i = 0; i < 5; i++) {
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('input[type="file"]');
        const fileChooser = await fileChooserPromise;
        
        await fileChooser.setFiles([{
          name: `test-${i}.txt`,
          mimeType: 'text/plain',
          buffer: Buffer.from('x'.repeat(1024 * 1024)), // 1MB
        }]);
        
        await page.waitForTimeout(100);
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if (typeof (window as any).gc === 'function') {
          (window as any).gc();
        }
      });
      
      // Check memory usage
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return null;
      });
      
      if (finalMemory !== null) {
        // Memory increase should be reasonable (less than 50MB)
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      }
    }
  });
});