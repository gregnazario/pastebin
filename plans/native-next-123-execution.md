# Native Next 123 Execution Plan

This plan executes the requested `1,2,3` sequence from the current native roadmap.

## Goals
- Complete Apple host/shell integration coverage expansion.
- Complete Android instrumentation edge expansion (second pass).
- Establish Phase 4 hardening baseline artifacts for accessibility, privacy, and performance.

## Scope
- Apple host shell module/tests:
  - `native/apple/Sources/AppShellDemo`
  - `native/apple/Tests/AppShellDemoTests`
- Android instrumentation:
  - `native/android/app/src/androidTest/kotlin/com/securepastebin/app`
  - `native/android/app/src/main/java/com/securepastebin/app/MainActivity.kt`
- Hardening artifacts:
  - `plans/`
  - `design-docs/`
  - native platform READMEs

## Ordered Steps
1. Add design documentation for this `1 -> 2 -> 3` pass.
2. Item 1 (Apple):
   - Add testable host runtime-settings apply/rebuild helper.
   - Extend host-shell tests for settings apply behavior and handoff persistence.
3. Item 2 (Android):
   - Add instrumentation for upload picker cancel/error behavior.
   - Add decrypt recreation behavior test.
   - Add history sync failure-then-retry behavior test.
4. Item 3 (Phase 4 hardening baseline):
   - Add hardening checklist and profiling protocol docs.
   - Update native READMEs to point to executable hardening workflow.
5. Run validation:
   - `swift test`
   - `gradle :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:assembleDebugAndroidTest :app:connectedDebugAndroidTest`
   - `bun run lint`
   - `bun run typecheck`
   - `bun test`
   - `bun run build`
