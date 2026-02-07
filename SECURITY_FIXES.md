# Security Fixes

This document tracks security issues and their fixes for the pastebin project.

---

## [2026-02-06] Security Audit Fixes

### Issue 1: HKDF Using Zero-Filled Salt
- **Severity**: High
- **Description**: The `combineKeys()` method in `HybridEncryption.ts` used `new Uint8Array(32)` (all zeros) as the HKDF salt, reducing the entropy of the key combination step.
- **Fix**: Now passes the Argon2id salt (cryptographically random 32 bytes) to HKDF, providing proper entropy mixing.
- **File**: `src/services/crypto/HybridEncryption.ts`

### Issue 2: Password Generator Modulo Bias
- **Severity**: Medium
- **Description**: The `generateSecurePassword()` function used `num % charset.length` to select characters from `crypto.getRandomValues()` output, introducing slight statistical bias toward earlier characters in the charset.
- **Fix**: Implemented rejection sampling — values that would cause bias are discarded and re-sampled. Uses `Math.floor(0xFFFFFFFF / charsetLen) * charsetLen` as the rejection threshold.
- **File**: `src/routes/upload.tsx`

### Issue 3: Argon2id Parameter Validation Missing
- **Severity**: Medium
- **Description**: The `deriveKeyCustom()` method accepted arbitrary parameters without bounds checking, potentially allowing misuse (e.g., zero iterations, excessive memory).
- **Fix**: Added parameter validation: salt >= 16 bytes, iterations 1-100, memory 16KB-4GB, parallelism 1-16.
- **File**: `src/services/crypto/KeyDerivation.ts`

### Note: Known Accepted Risks
- **CSP `unsafe-inline`**: Required for React SSR hydration. Nonce-based CSP would require framework-level support.
- **In-memory rate limiting**: Won't scale across multiple serverless instances. Accepted for current deployment scale; Redis recommended if scaling.

---

## [2026-02-02] Encrypted Filename Exposure in URL

### Issue
When a user uploaded a file with the "Encrypt filename and metadata" option enabled, the filename was still exposed in the generated shareable URL.

### Root Cause
The blob name used for storage was constructed as:
```
pastebin-{timestamp}-{sanitizedFilename}-{randomSuffix}
```

This meant that even though the filename was encrypted in the payload, it was also embedded in the URL path, defeating the purpose of the metadata encryption feature.

### Impact
- **Severity**: Medium
- **Privacy Impact**: Users who expected their filenames to be hidden could have their filenames exposed to anyone with access to the URL.
- **Affected Feature**: "Encrypt filename and metadata" checkbox on upload page

### Fix
Modified `FileEncryptionService.ts` to use a generic placeholder filename (`"encrypted"`) when the `encryptMetadata` option is enabled. The blob name now becomes:
```
pastebin-{timestamp}-encrypted-{randomSuffix}
```

The actual filename is still stored encrypted within the payload and is properly revealed only after decryption with the correct password.

### Files Changed
- `src/services/FileEncryptionService.ts`

### Testing
- Upload a file with "Encrypt filename and metadata" enabled
- Verify the generated URL contains `encrypted` instead of the actual filename
- Verify the file still downloads with the correct filename after decryption
