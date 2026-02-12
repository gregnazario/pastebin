# Native Shared Backend Default Plan

This plan aligns native Apple/Android backend defaults with the website backend so native apps do not require separate API configuration.

## Goals
- Use the same default backend origin as the website.
- Keep runtime settings/presets for optional local debugging only.
- Update tests and docs to reflect the new default.

## Scope
- Android defaults and related tests/docs.
- Apple defaults/fallbacks and related tests/docs.
- Conversation/state tracking docs.

## Steps
1. Add design doc with selected default origin and platform-specific integration points.
2. Android updates:
   - set default API base to production website origin.
   - update instrumentation assertions that relied on local default URLs.
3. Apple updates:
   - set demo runtime default and fallbacks to production website origin.
   - update app-shell tests expecting localhost fallback.
4. Update native READMEs describing default behavior.
5. Run validation:
   - `swift test`
   - `xcodebuild ... SecurePastebinDemoApp ... iOS Simulator build`
   - `gradle :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:assembleDebugAndroidTest`
   - `bun run lint`, `bun run typecheck`, `bun test`, `bun run build`
6. Update `CONVO.md` and `SCRATCHPAD.md`.

## Acceptance Criteria
- Native apps default to `https://pastebin.sed.fyi` backend.
- Local/staging options remain available as optional overrides.
- Tests/docs are consistent with the shared-backend default behavior.
