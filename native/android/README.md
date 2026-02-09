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
- Default API base is local emulator via `http://10.0.2.2:3000`.
- Runtime API settings are available in-app via `Settings`:
  - Presets: `Local`, `Staging`, `Production`
  - Manual API base URL override with validation
  - Selected API base persists across app launches
- Configure Android SDK before running Gradle tasks:
  - Set `ANDROID_HOME`, or
  - Create `native/android/local.properties` with `sdk.dir=/absolute/path/to/android/sdk`
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
  - Verifies Drive create-picker cancel path keeps sync in unconfigured state.
  - Verifies create/open picker invalid-authority results surface setup error messaging.
- `app/src/androidTest/kotlin/com/securepastebin/app/ApiSettingsUiTest.kt`
  - Verifies invalid manual API base URL is rejected with validation messaging.
  - Verifies preset apply updates current API base and persists across activity recreation.
- Run instrumentation tests (emulator/local device required):
  - `gradle :app:connectedDebugAndroidTest`

## Security Note
- `ProductionNativeCryptoEngine` is the default engine used by `:app`.
- `DevelopmentNativeCryptoEngine` remains available for isolated wiring tests only and is non-production.
