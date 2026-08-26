# Security Fixes

This document tracks security issues and their fixes for the pastebin project.

---

## [2026-08-22] Remove Shelby third-party browser surface

### Issue 1: Browser CSP allowed Shelby origins that the app no longer needs
- **Severity**: Low
- **Description**: `connect-src` and HTML preconnect included `*.shelby.xyz` even though encrypted blobs are uploaded through same-origin `/api/v1`.
- **Fix**: Restrict `connect-src` to `'self'` (plus local Vite HMR in development) and drop Shelby preconnect/dns-prefetch tags.
- **Files**:
  - `src/server.ts`
  - `src/routes/__root.tsx`

### Issue 2: Storage credentials must stay server-side after backend swap
- **Severity**: Info
- **Description**: The new S3/R2 adapter uses access keys. Those keys must never ship to web or native clients.
- **Fix**: S3 signing (`aws4fetch`) runs only in `src/server/storage.ts`. Clients continue to send ciphertext to `/api/v1` only. Health `account` reports `s3:<bucket>` without secrets.

---

## [2026-02-12] Shared Backend Transport Hardening

### Issue 1: Apple ATS policy was overly permissive
- **Severity**: Medium
- **Description**: iOS demo app used `NSAllowsArbitraryLoads=true`, which broadly permits non-HTTPS transport and weakens default ATS protections.
- **Fix**:
  - Removed `NSAllowsArbitraryLoads`.
  - Kept `NSAllowsLocalNetworking=true` to preserve local development connectivity.
- **File**:
  - `native/apple/AppShellDemoApp/Support/Info.plist`

### Issue 2: Android cleartext policy was not explicitly constrained by build type
- **Severity**: Medium
- **Description**: Android app did not define explicit network security config separating debug local cleartext use from release HTTPS-only behavior.
- **Fix**:
  - Added `android:networkSecurityConfig="@xml/network_security_config"` and `android:usesCleartextTraffic="false"` in manifest.
  - Added debug policy allowing cleartext only for local hosts (`10.0.2.2`, `127.0.0.1`, `localhost`).
  - Added release policy denying cleartext globally.
- **Files**:
  - `native/android/app/src/main/AndroidManifest.xml`
  - `native/android/app/src/debug/res/xml/network_security_config.xml`
  - `native/android/app/src/release/res/xml/network_security_config.xml`

### Issue 3: Missing standardized client observability headers reduced incident traceability
- **Severity**: Low
- **Description**: Native requests lacked normalized optional client metadata, making cross-platform incident triage harder.
- **Fix**:
  - Added request headers on native API clients:
    - `X-Client-Platform`
    - `X-Client-Version`
    - `X-Request-Id`
  - Added API response `X-Request-Id` header on `/api/v1/*` responses.
- **Files**:
  - `native/android/core/network/src/main/kotlin/com/securepastebin/core/network/ApiClient.kt`
  - `native/apple/Sources/CoreNetworking/APIClient.swift`
  - `src/server/apiV1.ts`

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
