# Testing Strategy

This document outlines the testing approach for the secure pastebin application.

## Testing Levels

### 1. Unit Tests (Vitest)
Individual component and service testing with mocked dependencies.

**Status**: ⚠️ Partially implemented
- ✅ Password validation tests
- ⚠️ Crypto service tests (require runtime mocking)
- ⚠️ Storage service tests (require API mocking)

**Issues**:
- Noble library imports fail in test environment
- Argon2 WASM loading issues
- Need proper module mocking setup

### 2. Integration Tests
Testing service interactions without full UI.

**Status**: 🚧 In progress
- Created FileEncryptionService integration tests
- Need proper crypto library mocking

### 3. End-to-End Tests (Playwright)
Full user flow testing in real browsers.

**Status**: ✅ Implemented
- Complete upload/download flow
- Password validation
- Error handling
- File size limits
- Metadata encryption

## Test Coverage Goals

### Critical Paths (Must Test)
1. ✅ File upload with encryption
2. ✅ File download with decryption
3. ✅ Password validation
4. ✅ Error handling (wrong password, missing key)
5. ✅ File size limits
6. ⏳ Cross-browser compatibility

### Security Tests
1. ⏳ Password strength enforcement
2. ⏳ Memory cleanup after operations
3. ⏳ URL fragment security (key not sent to server)
4. ⏳ Timing attack resistance

### Performance Tests
1. ⏳ Large file handling (up to 100MB)
2. ⏳ Encryption/decryption speed
3. ⏳ Memory usage during operations

## Testing Challenges

### 1. Crypto Library Mocking
The Noble libraries don't work well in Node.js test environment:
- `@noble/post-quantum/ml-kem` - Kyber implementation
- `@noble/ciphers/aes` - AES implementation
- `argon2-browser` - Requires WASM

**Solution**: Use E2E tests for full crypto validation.

### 2. Shelby.xyz API
The storage backend requires real HTTP requests.

**Solution**: Mock at the fetch level for unit tests, use localnet for E2E.

### 3. File Operations
FileReader API and Blob handling need browser environment.

**Solution**: Mock FileReader in unit tests, use real browser in E2E.

## Running Tests

```bash
# Unit tests (limited due to mocking issues)
bun test

# E2E tests (recommended for full validation)
bun test:e2e

# E2E with UI
bun test:e2e:ui

# Debug E2E tests
bun test:e2e:debug
```

## Test Data

### Passwords
- Strong: `TestPassword123!@#$`
- Weak examples: `weak`, `12345678`, `NoSpecial1`

### File Types
- Text files (`.txt`)
- JSON files (`.json`)
- Binary files
- Large files (5MB, 50MB, 100MB+)

## CI/CD Recommendations

1. Run unit tests on every commit
2. Run E2E tests on pull requests
3. Use Playwright's built-in retry for flaky tests
4. Generate test reports and screenshots on failure
5. Test against multiple browsers (Chrome, Firefox, Safari)

## Future Improvements

1. Add visual regression testing
2. Add accessibility testing
3. Add security scanning (OWASP ZAP)
4. Add load testing for concurrent uploads
5. Add API contract testing
6. Implement proper module mocking for unit tests