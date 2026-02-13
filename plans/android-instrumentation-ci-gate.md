# Android Instrumentation CI Gate Plan

This plan adds emulator-based Android instrumentation coverage to CI.

## Goals
- Run Android UI instrumentation tests in CI on every PR/push to main.
- Reuse the existing native Android instrumentation command path.
- Keep existing web and Android release jobs intact.

## Scope
- `.github/workflows/ci.yml`
- `design-docs/android-instrumentation-ci-gate.md`
- Tracking docs (`CONVO.md`, `SCRATCHPAD.md`)

## Steps
1. Add design doc describing emulator test strategy and runner settings.
2. Extend CI workflow with an `android-instrumentation` job that:
   - sets up JDK 23, Android SDK, and Gradle
   - boots an emulator in headless mode
   - runs `gradle :app:compileDebugAndroidTestKotlin :app:assembleDebugAndroidTest :app:connectedDebugAndroidTest`
3. Run local non-emulator validation commands for instrumentation build artifacts.
4. Update tracking docs with commands and outcomes.

## Acceptance Criteria
- CI has a dedicated Android instrumentation job.
- Job executes connected instrumentation tests on emulator.
- Existing jobs remain unchanged.
