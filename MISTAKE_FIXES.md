# Mistake Fixes

This document tracks implementation mistakes discovered during development and their fixes.

---

## [2026-02-08] Android Sync Instrumentation Fixture Timestamp Issue

### Issue 1: Configured Drive sync tests asserted missing imported entries
- **Context**: New `HistoryUiCoverageTest` sync tests compiled, but `connectedDebugAndroidTest` failed on visibility assertions for synced file names.
- **Root Cause**: Fixture `expiresAtMillis` values used small absolute numbers (epoch-adjacent), so entries were immediately treated as expired and filtered out by default (`Include expired` disabled).
- **Fix**:
  - Updated fixture timestamps in `native/android/app/src/androidTest/kotlin/com/securepastebin/app/HistoryUiCoverageTest.kt` to use `System.currentTimeMillis()` with future expirations.
  - Re-ran `gradle :app:compileDebugAndroidTestKotlin :app:assembleDebugAndroidTest :app:connectedDebugAndroidTest`.
- **Result**: Instrumentation suite now passes (`6/6` tests) with stable synced-entry assertions.

## [2026-02-08] Android Compose Build Import Issue

### Issue 1: Explicit `weight` Import Broke Kotlin Compile in App Host
- **Context**: Running the first full Android Gradle compile pass after SDK setup failed in `MainActivity.kt`.
- **Root Cause**: `import androidx.compose.foundation.layout.weight` resolved to an internal API symbol under the current Compose/Kotlin toolchain combination.
- **Fix**:
  - Removed the explicit import from `native/android/app/src/main/java/com/securepastebin/app/MainActivity.kt`.
  - Kept `Modifier.weight(1f)` usage inside `Row` scope, which resolves correctly without the direct import.
  - Re-ran:
    - `gradle :feature:history:testDebugUnitTest :feature:upload:testDebugUnitTest :feature:view:testDebugUnitTest :app:compileDebugKotlin`
- **Result**: Android module tests and app Kotlin compile now pass in the local environment.

## [2026-02-08] Android Instrumentation Assertion API Mismatch

### Issue 1: `assertExists` Import Failed During `androidTest` Kotlin Compile
- **Context**: New Compose instrumentation test (`HistoryToDecryptHandoffTest`) failed to compile.
- **Root Cause**: `assertExists` was imported from a package symbol not exposed by the current Compose test artifact set in this project configuration.
- **Fix**:
  - Replaced assertions with `assertIsDisplayed` in the instrumentation test.
  - Re-ran `gradle :app:compileDebugAndroidTestKotlin :app:assembleDebugAndroidTest`.
- **Result**: Android instrumentation test sources now compile and package successfully.

## [2026-02-07] Native Crypto Adapter Build/Logic Issues

### Issue 1: Swift Argon2 Dependency Linked `genkat.c` (`_main`) Into Test Binary
- **Context**: Enabling the upstream `Argon2` package introduced a duplicate `_main` symbol while linking `swift test`.
- **Root Cause**: The upstream C target includes `genkat.c`, which defines a standalone executable `main`.
- **Fix**:
  - Removed direct dependency on upstream `CArgon2` product.
  - Vendored a minimal Argon2 C subset under `native/apple/Vendor/Argon2`.
  - Excluded `genkat.c` and added a vendor README documenting the reason.
- **Result**: `swift test` now links and passes.

### Issue 2: Kotlin `readUInt32()` Returned `Unit` Due Newline After `return`
- **Context**: `ProductionNativeCryptoEngine.kt` payload parser had a malformed `readUInt32()` implementation.
- **Root Cause**: A line break immediately after `return` triggered Kotlin semicolon insertion, returning `Unit`.
- **Fix**: Rewrote the expression so `return` and expression are on the same statement.
- **Result**: Core crypto Kotlin sources compile correctly under direct `kotlinc` checks.

## [2026-02-07] Native Decrypt Action Wiring Issue

### Issue 1: SwiftUI `fileExporter` Integration Initially Used an Incompatible Binding Shape
- **Context**: Wiring decrypt "Save As" in `DecryptFlowView.swift` initially failed compile checks.
- **Root Cause**: The first integration path used a `fileExporter` overload shape that did not match the document state binding arrangement in the view model.
- **Fix**:
  - Added an explicit `DecryptedFileDocument` `FileDocument` type.
  - Stored export document state on `DecryptFlowViewModel`.
  - Wired `fileExporter` to `isPresented`, optional document binding, content type, and completion handler.
- **Result**: Apple native decrypt action compiles and runs with passing `swift test`.

## [2026-02-07] Native History Link Encoding Issue

### Issue 1: Apple history URL builder double-encoded IDs with spaces
- **Context**: New history-row open/share tests expected `/p/file%20abc`, but produced `/p/file%2520abc`.
- **Root Cause**: ID was manually percent-encoded before assigning to `URLComponents.path`, then encoded again by `URLComponents`.
- **Fix**:
  - Stopped pre-encoding the ID.
  - Assigned raw ID into `URLComponents.path` so encoding happens once.
  - Added/kept a regression test in `FeatureHistoryTests`.
- **Result**: Share URL generation is correct and `swift test` passes.
