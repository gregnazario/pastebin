# Android Instrumentation UI Expansion Plan

This plan expands Android instrumentation coverage beyond the initial history handoff test.

## Goal
- Add stable, deterministic UI instrumentation coverage for key history workflows and cloud-sync setup surfaces.

## Scope
- Add tests for:
  - history delete action behavior
  - include-expired filter toggle behavior
  - cloud-sync setup controls visibility when unconfigured
- Add any minimal UI testability hooks needed for stable selectors.

## Steps
1. Add stable test selector for include-expired switch.
2. Add a new instrumentation test suite for history UI scenarios.
3. Update Android native README instrumentation coverage section.
4. Validate with:
   - `gradle :app:compileDebugAndroidTestKotlin`
   - `gradle :app:assembleDebugAndroidTest`
   - `gradle :app:connectedDebugAndroidTest`

## Out of Scope
- Full mocked cloud-sync happy-path instrumentation (requires controllable Drive document fixture in test runtime).
- Upload/decrypt cryptographic workflow instrumentation.
