# Android Settings UI + Apple History Row Fallback Coverage Plan

This plan completes the remaining two parity hardening tasks.

## Goals
- Add Android instrumentation coverage for runtime API settings dialog behavior.
- Add Apple UI fallback coverage for history row actions when share URL is unavailable.

## Scope
- Android instrumentation tests in `native/android/app/src/androidTest`.
- Apple feature-level UI presentation contract updates/tests in `native/apple/Sources/FeatureHistory` and `native/apple/Tests/FeatureHistoryTests`.

## Steps
1. Add design documentation with deterministic test strategy.
2. Add Android settings UI instrumentation cases:
   - invalid manual URL shows validation error and does not apply
   - preset apply updates API base and persists across activity recreation
3. Add Apple row-action presentation helper for share URL fallback behavior.
4. Add Apple tests asserting row-action fallback mapping contract.
5. Update Android and Apple README/testing notes if behavior/test scope changed.
6. Run validation:
   - `swift test`
   - `gradle :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:assembleDebugAndroidTest :app:connectedDebugAndroidTest`
   - `bun run lint`, `bun run typecheck`, `bun test`, `bun run build`
