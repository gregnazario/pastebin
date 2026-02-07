# Scratchpad - Current State Tracking

This file maintains the current state of the project for smooth conversation handoffs.

## Current State (2026-02-07)

### Active Task
- **Phase**: Phase 2 foundation hardening (native crypto parity delivery).
- **Current Task**: Replace development crypto adapters with production-compatible native engines while preserving upload/decrypt feature interfaces.

### Production Crypto Progress (2026-02-07, latest update)
- ✅ Apple production crypto engine implemented:
  - `native/apple/Sources/CoreCrypto/ProductionNativeCryptoEngine.swift`
  - ML-KEM-768 (SwiftKyber), Argon2id (C Argon2), HKDF-SHA256, AES-256-GCM
  - Payload v1 binary serialization/deserialization parity with web
- ✅ Android production crypto engine implemented:
  - `native/android/core/crypto/src/main/kotlin/com/securepastebin/core/crypto/ProductionNativeCryptoEngine.kt`
  - ML-KEM-768 + Argon2id + HKDF-SHA256 + AES-256-GCM with parity payload parser
- ✅ Android app wiring switched to production engine:
  - `native/android/app/src/main/java/com/securepastebin/app/MainActivity.kt`
- ✅ Swift and Kotlin crypto tests updated:
  - roundtrip encryption/decryption
  - web conformance-vector decryption compatibility
- ✅ Apple conformance test passes against shared web vector:
  - `native/apple/Tests/CoreCryptoTests/CryptoConformanceVectorTests.swift`
- ✅ Added vendored Argon2 C subset for Apple build stability:
  - `native/apple/Vendor/Argon2/*`
  - excludes `genkat.c` to prevent duplicate `_main` linker conflict

### Current Verification Snapshot
- ✅ `bun run lint`
- ✅ `bun run typecheck`
- ✅ `bun test`
- ✅ `bun run build`
- ✅ `swift test` in `native/apple`
- ⚠️ `gradle -p native/android :core:crypto:test` blocked by missing SDK configuration (`ANDROID_HOME`/`sdk.dir`)
- ✅ Supplemental Kotlin syntax check for `:core:crypto` sources using `kotlinc` + BouncyCastle classpath

### Immediate Next Step
- Continue Phase 2 UI/domain parity:
  - wire native file picker flows (Apple + Android)
  - expand preview support beyond text
  - begin local history persistence integration in active screens

### Upload File Picker Progress (2026-02-07, latest update)
- ✅ Apple upload flow now supports note/file input mode switching:
  - `native/apple/Sources/FeatureUpload/UploadFlowView.swift`
  - Uses `fileImporter` + security-scoped URL access + MIME type detection.
- ✅ Android upload flow now supports note/file input mode switching:
  - `native/android/app/src/main/java/com/securepastebin/app/MainActivity.kt`
  - Uses `OpenDocument` launcher + content resolver metadata/byte loading.
- ✅ Existing upload orchestration (`UploadFeature`) reused unchanged on both platforms.
- ✅ Validation rerun:
  - `swift test` passed
  - `bun run lint`, `bun run typecheck`, `bun test`, `bun run build` passed
- ⚠️ Android build/test remains blocked in this environment until SDK path is configured.

### Updated Immediate Next Step
- Expand native decrypt preview and history UX parity:
  - file-type-aware preview surfaces (image/PDF/media)
  - history persistence wiring into active screens

### Decrypt Preview Progress (2026-02-07, latest update)
- ✅ Apple decrypt flow now supports MIME-aware preview rendering:
  - text, image, PDF, audio/video media
  - implemented in `native/apple/Sources/FeatureView/DecryptFlowView.swift`
- ✅ Android decrypt flow now supports MIME-aware preview rendering:
  - text, image, PDF first page, audio/video media
  - implemented in `native/android/app/src/main/java/com/securepastebin/app/MainActivity.kt`
- ✅ Temporary preview file lifecycle handling added for media/PDF preview payloads.
- ✅ Validation rerun:
  - `swift test` passed
  - `bun run lint`, `bun run typecheck`, `bun test`, `bun run build` passed
- ⚠️ Android compile/test remains blocked in this environment until SDK path is configured.

### New Immediate Next Step
- Wire history persistence and richer preview actions:
  - save/export decrypted payload
  - retain recent decrypt history with expiry metadata

### Save/Export + History Wiring Progress (2026-02-07, latest update)
- ✅ Apple decrypt flow now includes actions after successful decrypt:
  - `Save As` via SwiftUI `fileExporter`
  - `Export` via SwiftUI `ShareLink`
  - temporary preview/export file lifecycle cleanup
  - implementation: `native/apple/Sources/FeatureView/DecryptFlowView.swift`
- ✅ Apple history persistence added in `CoreStorage`:
  - `UserDefaultsHistoryStore` in `native/apple/Sources/CoreStorage/HistoryStore.swift`
  - decrypt success now persists history entry in `ViewFeature`
- ✅ Android decrypt flow now includes actions after successful decrypt:
  - `Save As` via `CreateDocument`
  - `Export` via share intent + `FileProvider`
  - implementation: `native/android/app/src/main/java/com/securepastebin/app/MainActivity.kt`
- ✅ Android history persistence added in `core:storage`:
  - `SharedPreferencesHistoryStore` in `native/android/core/storage/.../HistoryStore.kt`
  - decrypt success now persists history entry in `feature:view`
- ✅ Validation rerun:
  - `bun run lint` passed
  - `bun run typecheck` passed
  - `bun test` passed
  - `bun run build` passed
  - `swift test` passed
- ⚠️ Android Gradle validation remains blocked by missing SDK config:
  - `ANDROID_HOME` not set and no `native/android/local.properties` `sdk.dir`

### Updated Immediate Next Step
- Add history UI surfaces on native clients:
  - list recent decrypt/upload entries
  - delete entries
  - show expiration metadata with expired-state filtering

### History UI Surface Progress (2026-02-07, latest update)
- ✅ Apple `FeatureHistory` now includes:
  - list filtering (include/exclude expired entries)
  - expiration status mapping
  - delete action
  - SwiftUI `HistoryFlowView` + `HistoryFlowViewModel`
  - implementation: `native/apple/Sources/FeatureHistory/HistoryFeature.swift`
- ✅ Apple history feature tests added:
  - `native/apple/Tests/FeatureHistoryTests/FeatureHistoryTests.swift`
  - validates filtering, sorting, and delete behavior
- ✅ Android `feature:history` now includes:
  - list filtering (include/exclude expired entries)
  - expiration status mapping
  - delete action
  - implementation: `native/android/feature/history/.../HistoryFeature.kt`
- ✅ Android app now has a native History tab:
  - wired in `native/android/app/src/main/java/com/securepastebin/app/MainActivity.kt`
  - supports refresh, include-expired toggle, and per-entry delete
- ✅ Android history feature tests added:
  - `native/android/feature/history/src/test/.../HistoryFeatureTest.kt`
  - validates filtering, sorting, and delete behavior
- ✅ Validation rerun:
  - `swift test` passed
  - `bun run lint`, `bun run typecheck`, `bun test`, `bun run build` passed
- ⚠️ Android Gradle validation remains blocked by missing SDK config:
  - `gradle :feature:history:testDebugUnitTest`
  - `gradle :app:compileDebugKotlin`

### Updated Immediate Next Step
- Continue parity hardening for native clients:
  - integrate history navigation/action callbacks into Apple app host shell
  - add share/open actions directly from history entries
  - begin v1 cloud sync adapters (iCloud + Google Drive)

### Historical Snapshot
- Initial planning phase captured here for handoff traceability (now superseded by latest production crypto progress section above).

### New Planning Artifacts (2026-02-07)
- ✅ Added roadmap: `plans/native-swift-kotlin-roadmap.md`
- ✅ Added architecture/design doc: `design-docs/native-swift-kotlin-architecture.md`
- ✅ Captured parity baseline from current web app (upload, decrypt, note mode, history, security UX).
- ✅ Captured and finalized non-obvious tradeoff decisions:
  - Native crypto per platform with shared conformance vectors.
  - Versioned REST API for native clients.
  - Core-first v1 scope.
  - Include iCloud + Google Drive sync in v1.
  - Keep 100MB limit and fixed server expiration policy.
  - Include PDF/media preview in v1.
  - Slightly relaxed mobile password policy (with minimum security floor).
  - Parallel Apple + Android release; macOS deferred.
  - Rich analytics with privacy constraints.
  - Windows deferred until post-GA.

### Immediate Next Step
- Start Phase 0 implementation artifacts:
  - Define versioned REST API contract.
  - Produce cross-platform crypto conformance vectors.
  - Scaffold `native/apple/` and `native/android/` repositories/modules.

### Native Bootstrap Progress (2026-02-07)
- ✅ Implemented versioned native API endpoints in server runtime:
  - `GET /api/v1/health`
  - `POST /api/v1/upload`
  - `GET /api/v1/download?id=...`
  - `GET /api/v1/download/{id}`
- ✅ Refactored `src/server/shelby.ts` to expose reusable internal functions:
  - `uploadBlobInternal`
  - `downloadBlobInternal`
  - `checkHealthInternal`
  - Shared input validators
- ✅ Added API handler unit tests in `src/server/apiV1.test.ts`
- ✅ Added OpenAPI contract at `design-docs/native-api-v1-openapi.yaml`
- ✅ Scaffolded native workspaces:
  - `native/apple/` with modular Swift package layout
  - `native/android/` with modular Gradle layout
- ✅ Validation commands run and passing:
  - `bun run lint`
  - `bun run typecheck`
  - `bun test`
  - `bun run build`

### Native Implementation Progress (2026-02-07, continued)
- ✅ Swift `CoreNetworking` now has a real `URLSessionAPIClient` implementation:
  - typed request/response models
  - robust server error decoding
  - configuration and timeout controls
- ✅ Kotlin `core:network` now has a real `HttpApiClient` implementation:
  - upload/download/health calls against `/api/v1/*`
  - structured `ApiClientException` handling
  - JSON parsing and status-code handling
- ✅ Added Apple networking test target: `CoreNetworkingTests`
- ✅ Added shared crypto conformance vector source:
  - `shared/crypto/conformanceVectors.ts`
- ✅ Added conformance verification test in web runtime:
  - `src/services/crypto/ConformanceVectors.test.ts`
  - test decrypts vector payload and verifies metadata/plaintext fidelity

### Native Feature Flow Progress (2026-02-07, latest)
- ✅ Apple upload/decrypt orchestration implemented:
  - `FeatureUpload` now coordinates metadata + encrypt + upload + share-link generation.
  - `FeatureView` now coordinates share-link parse + download + decrypt.
- ✅ Apple core crypto interfaces expanded for production integration contract.
- ✅ Apple feature tests added and passing via `swift test`.
- ✅ Android upload/decrypt orchestration implemented with parity flow.
- ✅ Android core crypto interfaces expanded for production integration contract.
- ✅ Android feature tests added for upload and decrypt orchestration.
- ⚠️ Android test execution blocked in environment:
  - Gradle runs, but Android SDK is not configured (`ANDROID_HOME` / `local.properties` `sdk.dir`).
  - Command attempted: `gradle -p native/android :feature:upload:test :feature:view:test`.

### Native UI Wiring Progress (2026-02-07, latest update)
- ✅ SwiftUI screen layer added for upload/decrypt flows:
  - `UploadFlowView.swift`
  - `DecryptFlowView.swift`
- ✅ Android Compose app shell added with Upload/Decrypt tabs in `MainActivity`.
- ✅ Development-only crypto adapters added to both platforms to enable real flow wiring before production crypto parity lands:
  - Swift: `DevelopmentNativeCryptoEngine`
  - Kotlin: `DevelopmentNativeCryptoEngine`
- ✅ Apple tests now cover:
  - Core crypto roundtrip (development adapter)
  - Networking config
  - Upload/decrypt feature orchestration
- ⚠️ Android Gradle unit tests remain blocked until SDK path is configured locally.

### Current Verification Snapshot
- ✅ `bun run lint`
- ✅ `bun run typecheck`
- ✅ `bun test`
- ✅ `bun run build`
- ✅ `swift test` in `native/apple`
- ⚠️ Android Gradle tests pending SDK configuration

### Updated Immediate Next Step
- Begin Phase 1 security spec and compatibility deliverables:
  - Generate crypto conformance vectors from web implementation.
  - Define strict payload parser/serializer conformance tests for Swift and Kotlin targets.
  - Implement first real native API client adapters in `CoreNetworking` (Swift/Kotlin).

### Project Status
- **Phase**: Phase 5 - Testing & Benchmarking (Advanced)
- **Current Task**: Performance benchmarks and file type testing
- **Next Steps**: Browser compatibility testing, final deployment

### Completed Phases
1. ✅ **Phase 1**: React TypeScript setup with routing
2. ✅ **Phase 2**: Shelby.xyz storage integration
3. ✅ **Phase 3**: Cryptography implementation (Kyber + AES-GCM)
4. ✅ **Phase 4**: Upload/download UI with encryption

### Active Work
- ✅ Created FileEncryptionService to orchestrate workflows
- ✅ Updated UploadPage with password validation and progress
- ✅ Updated ViewPage with decryption and download
- ✅ Added progress indicators and error handling
- ✅ Implemented secure link generation with key in fragment
- ✅ Added clipboard functionality

### Key Technical Decisions
1. **Hybrid Encryption**: Kyber768 + AES-256-GCM for post-quantum security
2. **Key Management**: Private key in URL fragment (never sent to server)
3. **Password Validation**: Entropy-based with visual feedback
4. **Progress Tracking**: Multi-stage progress for user feedback
5. **Security**: Memory clearing, password hiding, automatic cleanup

### Architecture Overview
```
Frontend (React) → Encryption Layer → Storage (Shelby)
    ↓                    ↓                    ↓
  UI/UX            Kyber + AES          Decentralized
                   Argon2 KDF              Storage
```

### Features Implemented
- 📤 **Upload**: File selection, password validation, encryption, progress
- 📝 **Note Input**: Direct text/note editing with mode selector toggle
- 🔐 **Encryption**: Post-quantum Kyber + AES-GCM hybrid
- 🔗 **Links**: Shareable URLs with private key in fragment
- 📥 **Download**: Password entry, decryption, automatic download
- 🎨 **UI**: Progress bars, error handling, success states
- 📋 **Clipboard**: One-click link copying
- 📜 **History**: Browser-based paste history with generic persistence layer

### Environment
- Working Directory: `/Users/greg/git/pastebin`
- Platform: macOS (Darwin 25.2.0)
- Git Status: Phases 1-3 committed, Phase 4 ready
- Dev Server: `bun dev`
- Tests: `bun test`
- Build: `bun run build`

### Known Issues
- Argon2 WASM loading in tests (mocked)
- Some crypto tests need runtime environment
- Shelby API endpoints need verification

### Phase 5 Progress
- ✅ Created comprehensive E2E test suite with Playwright
- ✅ Added test scripts and configuration
- ✅ Created testing strategy documentation
- ⚠️ Unit tests blocked by crypto library compatibility issues
- 📝 Documented testing challenges and solutions

### Phase 6: LLM-Friendliness & Full Accessibility (2026-02-06)
- ✅ Created `llms.txt` and `llms-full.txt` for AI crawler discoverability
- ✅ Created `sitemap.xml` (was referenced in robots.txt but missing)
- ✅ Updated `robots.txt` with LLM documentation references
- ✅ Added JSON-LD structured data (WebApplication, WebSite, FAQPage schemas)
- ✅ Added canonical URL link
- ✅ Added skip navigation link for keyboard/screen reader users
- ✅ Added visible `:focus-visible` styles for all interactive elements
- ✅ Added `.sr-only` utility class for screen-reader-only content
- ✅ Fixed heading hierarchy (h1 → h2 on home page features)
- ✅ Converted upload form to proper `<form>` with `onSubmit`
- ✅ Added `aria-describedby` for error associations on all form fields
- ✅ Added `aria-invalid` states on password fields
- ✅ Added `role="progressbar"` with aria-valuenow/min/max on progress bars
- ✅ Used `<output>` element for progress containers (semantic status)
- ✅ Added `aria-busy` on submit buttons during upload/decrypt
- ✅ Added `role="alert"` on error messages for screen reader announcements
- ✅ Converted decrypt form to proper `<form>` with `onSubmit`
- ✅ Used `<dl>` for file details instead of `<p>` for semantic structure
- ✅ Added `aria-expanded` and `aria-controls` on preview toggle
- ✅ Improved collapsible sections with `aria-controls` and `aria-labelledby`
- ✅ Made specs tables accessible with `<th scope="row">` and visually-hidden `<thead>`
- ✅ Added `aria-label` on all `<nav>` elements (Main, Mobile, Footer)
- ✅ Added `aria-controls` on mobile hamburger button
- ✅ Added `aria-hidden` on mobile nav overlay, proper focus management
- ✅ Improved onboarding modal with focus trap, focus restore, and `aria-describedby`
- ✅ Used `<fieldset>` for mode selector with visually-hidden `<legend>`
- ✅ Used semantic `<ul>/<li>` for feature cards on home page
- ✅ Added high-contrast mode support (already existed)
- ✅ Added prefers-reduced-motion support (already existed)
- ✅ All lint checks pass, all type checks pass, build succeeds

### Phase 7: Browser Compat, Performance, Security Audit, Deployment (2026-02-06)

#### Browser Compatibility
- ✅ Added `.browserslistrc` with explicit browser targets
- ✅ Added `build.target` in Vite config (Chrome 92+, Firefox 91+, Safari 15.4+, Edge 92+)
- ✅ Verified CSS features (Grid, custom properties, env()) are supported by targets
- ✅ Noble crypto libraries use pure JS (no SubtleCrypto dependency issues)

#### Performance Optimization
- ✅ Improved Service Worker with versioned caching (CACHE_VERSION)
- ✅ Added stale-while-revalidate strategy for static assets
- ✅ Added cache size limiting (MAX_DYNAMIC_CACHE_ENTRIES = 50)
- ✅ Added cache expiration logic in SW
- ✅ Excluded `/p/*` paste pages from caching (encrypted data)
- ✅ Added `llms.txt` and `sitemap.xml` to precache list
- ✅ Verified code splitting: crypto, blockchain, react-vendor, router chunks
- ✅ Verified lazy loading: FileEncryptionService dynamically imported
- ✅ Verified route preloading on hover intent (100ms delay)

#### Security Audit
- ✅ Fixed HKDF zero-filled salt → now uses Argon2id salt
- ✅ Fixed password generator modulo bias → rejection sampling
- ✅ Added Argon2id parameter bounds validation in deriveKeyCustom
- ✅ Documented accepted risks (CSP unsafe-inline, in-memory rate limiting)
- ✅ Updated SECURITY_FIXES.md with all findings

#### Deployment Configuration
- ✅ Added custom 404 page with navigation links
- ✅ Verified Vercel config, WASM handling, Nitro preset
- ✅ Verified env var validation (SHELBY_API_KEY, SHELBY_PRIVATE_KEY)
- ✅ Verified CI/CD pipeline (lint, typecheck, build in GitHub Actions)
- ✅ Verified security headers (CSP, HSTS, X-Frame-Options, etc.)

### Next Steps
- Add error tracking integration (Sentry or similar)
- Add monitoring/APM integration
- Expose `/health` HTTP endpoint (currently server function only)
- Use Redis for distributed rate limiting (if scaling to multiple instances)
- Add Web Vitals tracking with `web-vitals` package

### Commands
```bash
# Development
bun dev          # Start dev server
bun test         # Run tests
bun run build    # Production build
bun run lint     # Check code style
bun run typecheck # Type checking
```

---

*Last updated: 2026-02-07*
