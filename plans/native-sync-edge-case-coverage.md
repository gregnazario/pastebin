# Native Sync Edge-Case Coverage Plan

This plan expands native sync test coverage for edge paths not yet covered by current suites.

## Goals
- Add Android instrumentation coverage for Drive sync file re-selection behavior.
- Add Android instrumentation coverage for sync-failure error surfacing.
- Add Apple UI-level cloud-sync messaging contract tests for `HistoryFlowView` rendering logic.

## Scope
- Android instrumentation updates in `native/android/app/src/androidTest`.
- Apple `FeatureHistory` test updates in `native/apple/Tests/FeatureHistoryTests`.
- Minimal implementation hooks only where required for deterministic assertions.

## Steps
1. Add Android test fixture helpers for multiple configured Drive file URIs.
2. Add Android test for configured URI swap (re-selection simulation) and post-sync rendering.
3. Add Android test for malformed sync payload error surfacing in history UI.
4. Add Apple message/title presentation helpers used by `HistoryFlowView` cloud sync section.
5. Add Apple tests validating helper output for all cloud-sync states.
6. Run validation:
   - `swift test`
   - `gradle :app:compileDebugAndroidTestKotlin :app:assembleDebugAndroidTest :app:connectedDebugAndroidTest`
   - `bun run lint`, `bun run typecheck`, `bun test`, `bun run build`
