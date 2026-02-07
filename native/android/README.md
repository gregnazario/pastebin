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
- The app currently targets local API via `http://10.0.2.2:3000` (Android emulator loopback).
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

## Security Note
- `ProductionNativeCryptoEngine` is the default engine used by `:app`.
- `DevelopmentNativeCryptoEngine` remains available for isolated wiring tests only and is non-production.
