# Android UI Instrumentation Coverage Plan

This plan defines how Android UI instrumentation coverage is added for native history-to-decrypt handoff behavior.

## Goal
- Add deterministic instrumentation coverage for the Compose flow where History `Open` routes users into Decrypt with prefilled share URL.

## Scope
- Add `androidTest` dependency wiring in `native/android/app/build.gradle.kts`.
- Add one instrumentation test in `native/android/app/src/androidTest/...`.
- Document the coverage and execution command in `native/android/README.md`.

## Steps
1. Add Compose/JUnit Android instrumentation test dependencies and manifest helper.
2. Seed history storage in test setup and clear between runs.
3. Implement UI interaction test:
   - open History tab
   - refresh entries
   - tap `Open`
   - assert Decrypt screen is shown with prefilled share URL
4. Validate buildability with:
   - `gradle :app:compileDebugAndroidTestKotlin`
   - `gradle :app:assembleDebugAndroidTest`
5. Attempt runtime execution via `gradle :app:connectedDebugAndroidTest` (requires emulator/device).

## Out of Scope
- Full instrumentation suite for upload/decrypt network flows.
- Emulator provisioning automation.
