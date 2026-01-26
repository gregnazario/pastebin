# End-to-End Tests

This directory contains Playwright end-to-end tests for the secure pastebin application.

## Setup

1. Install dependencies:
```bash
bun add -d @playwright/test
bunx playwright install
```

2. Start the development server:
```bash
bun dev
```

3. Run tests in another terminal:
```bash
bun test:e2e
```

## Test Coverage

### Upload/Download Flow
- ✅ Complete file upload with encryption
- ✅ Download and decrypt with correct password
- ✅ Fail with wrong password
- ✅ Handle missing decryption key

### Password Validation
- ✅ Weak password rejection
- ✅ Strong password acceptance
- ✅ Visual strength indicator
- ✅ Show/hide password toggle

### File Handling
- ✅ Small file upload
- ✅ Large file upload (5MB) with progress
- ✅ File size limit enforcement
- ✅ Multiple file types

### UI Features
- ✅ Copy link to clipboard
- ✅ Progress indicators
- ✅ Error messages
- ✅ Success states
- ✅ Metadata encryption option

## Running Tests

```bash
# Run all tests
bun test:e2e

# Run with UI mode (interactive)
bun test:e2e:ui

# Debug mode
bun test:e2e:debug

# Run specific test file
bunx playwright test upload-download.e2e.ts

# Run in headed mode (see browser)
bunx playwright test --headed
```

## Writing Tests

Tests use Playwright's test API:

```typescript
import { test, expect } from '@playwright/test';

test('should do something', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Secure Pastebin');
});
```

## Best Practices

1. Use data-testid attributes for stable selectors
2. Wait for specific conditions, not arbitrary timeouts
3. Test user-visible behavior, not implementation details
4. Keep tests independent and isolated
5. Use descriptive test names

## Debugging

1. Use `--debug` flag to step through tests
2. Add `await page.pause()` to pause execution
3. Use `--headed` to see the browser
4. Check test reports in `playwright-report/`
5. Screenshots on failure in `test-results/`

## CI/CD

Tests are configured to:
- Run in parallel
- Retry failed tests twice on CI
- Generate HTML reports
- Take screenshots on failure
- Record trace on first retry