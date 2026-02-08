# Android Picker Edge + Runtime API Settings Plan

This plan delivers two items:
1) Android instrumentation coverage for picker cancel and invalid-authority edge paths.
2) Android runtime API environment settings to support real-device testing without rebuilds.

## Goals
- Add deterministic instrumentation tests for Drive picker launcher edge cases.
- Add persisted runtime API base URL settings with presets and manual override.
- Keep behavior stable for existing upload/decrypt/history/sync flows.

## Scope
- Android app module updates in `native/android/app`.
- Instrumentation tests in `native/android/app/src/androidTest`.
- Android documentation and tracking docs updates.

## Steps
1. Add plan/design documentation for this change set.
2. Add Android runtime API settings primitives:
   - persisted config store
   - preset definitions (Local/Staging/Production)
   - URL validation helpers
3. Wire settings UI into app shell and rebuild feature dependencies from selected API base.
4. Add instrumentation tests for:
   - picker cancel path (no config mutation/error)
   - invalid-authority create picker path (setup error surfaced)
   - invalid-authority open picker path (setup error surfaced)
5. Update Android README coverage and runtime settings docs.
6. Run validation:
   - `gradle :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:assembleDebugAndroidTest :app:connectedDebugAndroidTest`
   - `bun run lint`, `bun run typecheck`, `bun test`, `bun run build`
