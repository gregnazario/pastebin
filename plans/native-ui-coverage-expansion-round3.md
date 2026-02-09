# Native UI Coverage Expansion (Round 3) Plan

This plan executes the next two hardening tasks in order: Android instrumentation expansion first, then Apple interaction-level UI coverage.

## Goals
- Increase Android instrumentation coverage for upload/decrypt/history edge cases and activity recreation behavior.
- Add Apple SwiftUI interaction-level tests around parity-risk UI actions.

## Scope
- Android: `native/android/app/src/androidTest/kotlin/com/securepastebin/app`
- Apple: `native/apple/Tests/FeatureUploadTests`, `native/apple/Tests/FeatureViewTests`

## Steps
1. Add design documentation with deterministic test strategy and sequencing (`1` then `2`).
2. Android first:
   - Add instrumentation coverage for decrypt error edges.
   - Add instrumentation coverage for upload mode/button edge behavior.
   - Add instrumentation coverage for history/device-state recreation behavior.
   - Add minimal Compose test tags required for deterministic targeting.
3. Apple second:
   - Add interaction-level tests for `UploadFlowViewModel` user actions.
   - Add interaction-level tests for `DecryptFlowViewModel` user actions.
4. Update Android/Apple README test coverage notes.
5. Run validation:
   - `gradle :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:assembleDebugAndroidTest :app:connectedDebugAndroidTest`
   - `swift test`
   - `bun run lint`
   - `bun run typecheck`
   - `bun test`
   - `bun run build`
