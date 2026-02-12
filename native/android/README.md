# Android Native App (Kotlin)

This workspace contains the Kotlin + Android foundations for Secure Pastebin.

## Architecture
- Jetpack Compose UI layer
- Modularized `core` and `feature` modules
- API v1 integration against `/api/v1/*`

## Modules
- `:app`
- `:core:crypto`, `:core:network`, `:core:storage`
- `:feature:upload`, `:feature:view`, `:feature:history`

## Running the App
- Default API base is website production backend via `https://pastebin.sed.fyi`.
- Runtime API settings are available in-app via `Settings`:
  - Presets: `Local`, `Staging`, `Production`
  - Manual API base URL override with validation
  - Selected API base persists across app launches
- Network transport policy:
  - Debug builds allow cleartext only for local development hosts (`10.0.2.2`, `127.0.0.1`, `localhost`).
  - Release builds deny cleartext and require HTTPS endpoints.
- API requests include optional observability headers:
  - `X-Client-Platform: android`
  - `X-Client-Version: <app version>`
  - `X-Request-Id: <per-request UUID>`
- Configure Android SDK before running Gradle tasks:
  - Set `ANDROID_HOME`, or
  - Create `native/android/local.properties` with `sdk.dir=/absolute/path/to/android/sdk`
- Release build lint behavior:
  - `gradle :app:assembleRelease` works without manual lint task exclusions.
  - On JVM 24+ runtimes, release lint checks are automatically disabled because AGP `8.6.1` lint crashes during analysis.
  - On supported JVMs (for example JVM 23), `lintVitalRelease` remains enabled.
- Upload screen supports:
  - note input mode
  - native document picker mode via `OpenDocument`
- Decrypt screen supports MIME-aware preview for:
  - text
  - image
  - PDF (first-page render)
  - audio/video media (`VideoView` controls)
- Decrypt screen now includes post-decrypt actions:
  - Save As (document picker destination)
  - Export (Android share sheet via `FileProvider`)
- Decrypt success now persists local history metadata through `SharedPreferencesHistoryStore`.
- App now includes a native History tab:
  - filtered list of recent entries
  - expired-entry toggle
  - delete action for entries
  - open/share actions for generated history links
  - `Open` routes to Decrypt tab and pre-fills share URL in-app
  - Google Drive cloud-sync controls:
    - connect/create Drive-backed sync JSON file
    - run conflict-aware one-shot sync with summary state

## Premium Minimal Design System
- Shared Compose theme tokens and reusable surfaces:
  - `app/src/main/java/com/securepastebin/app/PremiumMinimalDesignSystem.kt`
- Applied in app shell and flow screens:
  - `app/src/main/java/com/securepastebin/app/MainActivity.kt`
- Existing instrumentation selectors/tags are preserved during styling pass.

## Instrumentation Coverage
- `app/src/androidTest/kotlin/com/securepastebin/app/HistoryToDecryptHandoffTest.kt`
  - Verifies history `Open` switches to Decrypt and pre-fills share URL.
- `app/src/androidTest/kotlin/com/securepastebin/app/HistoryUiCoverageTest.kt`
  - Verifies history delete action removes entries in UI.
  - Verifies expired-entry filtering toggle behavior.
  - Verifies cloud-sync setup controls appear when Drive sync is unconfigured.
  - Verifies configured Drive sync `Sync Now` success summary and imported entry visibility.
  - Verifies configured Drive sync conflict summary path and remote-winner rendering.
  - Verifies configured Drive sync URI re-selection path uses updated fixture state.
  - Verifies malformed Drive sync payload path surfaces user-visible error messaging.
  - Verifies sync failure on malformed payload can recover via retry with valid fixture.
  - Verifies Drive create-picker cancel path keeps sync in unconfigured state.
  - Verifies create/open picker invalid-authority results surface setup error messaging.
- `app/src/androidTest/kotlin/com/securepastebin/app/ApiSettingsUiTest.kt`
  - Verifies invalid manual API base URL is rejected with validation messaging.
  - Verifies preset apply updates current API base and persists across activity recreation.
- `app/src/androidTest/kotlin/com/securepastebin/app/UploadDecryptUiCoverageTest.kt`
  - Verifies file-mode upload remains disabled without a selected file.
  - Verifies upload picker cancel path keeps selection empty and submit disabled.
  - Verifies upload picker invalid URI path does not create selected-file state and keeps submit disabled.
  - Verifies note-mode draft input is cleared after activity recreation.
  - Verifies decrypt draft input is cleared after activity recreation.
  - Verifies decrypt invalid-share/missing-key errors surface deterministic validation messaging.
  - Verifies configured cloud-sync controls remain available after activity recreation.
- Run instrumentation tests (emulator/local device required):
  - `gradle :app:connectedDebugAndroidTest`

## Phase 4 Hardening Baseline
- Hardening checklist and profiling protocol:
  - `design-docs/native-phase4-hardening-baseline.md`
- Latest execution report:
  - `design-docs/native-phase4-hardening-report-2026-02-09.md`
- Physical-device sign-off runbook and evidence templates:
  - `native/qa/phase4/README.md`

## Phase 5 Store Readiness
- Android packaging templates and checklist:
  - `native/release/android/release-checklist.md`
  - `native/release/android/play-console-metadata.md`
  - `native/release/android/data-safety-template.md`
- Unified release gate:
  - `native/release/release-gate-checklist.md`
- Latest Phase 4/5 execution report:
  - `design-docs/native-phase4-phase5-execution-report-2026-02-09.md`

## Security Note
- `ProductionNativeCryptoEngine` is the default engine used by `:app`.
- `DevelopmentNativeCryptoEngine` remains available for isolated wiring tests only and is non-production.
