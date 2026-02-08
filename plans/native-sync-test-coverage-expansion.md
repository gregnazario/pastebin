# Native Sync Test Coverage Expansion Plan

This plan expands native test coverage for cloud sync state handling across Apple and Android.

## Goals
- Add Apple tests for `HistoryFlowViewModel` cloud sync state transitions.
- Add Android instrumentation coverage for configured Google Drive sync execution and summary/conflict output.

## Scope
- Apple unit tests in `native/apple/Tests/FeatureHistoryTests`.
- Android instrumentation tests in `native/android/app/src/androidTest`.
- Minimal UI/testability hooks only if required for deterministic assertions.

## Steps
1. Add Apple view-model tests for:
   - unconfigured sync failure state
   - successful sync summary state
   - sync failure error state
2. Add Android instrumentation tests for:
   - configured sync file + successful `Sync Now` summary
   - configured sync file + conflict-count summary path
3. Update Android instrumentation docs.
4. Run validation:
   - `swift test`
   - `gradle :app:compileDebugAndroidTestKotlin :app:assembleDebugAndroidTest :app:connectedDebugAndroidTest`
   - `bun run lint`, `bun run typecheck`, `bun test`, `bun run build`
