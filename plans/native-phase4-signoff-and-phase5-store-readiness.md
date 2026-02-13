# Native Phase 4 Sign-Off + Phase 5 Store Readiness Plan

This plan executes the two remaining release tracks:
- Phase 4 manual hardening sign-off evidence on physical devices.
- Phase 5 store packaging and rollout artifacts for Apple and Android.

## Goals
- Make Phase 4 sign-off executable with a repeatable evidence pack.
- Produce store submission artifacts and checklists that block release until complete.
- Keep artifact locations stable so handoffs are deterministic.

## Scope
- Documentation + release artifact templates only.
- No production behavior changes.
- No secret material committed.

## Steps
1. Add design doc with execution flow and artifact model:
   - `design-docs/native-phase4-signoff-and-phase5-store-readiness.md`
2. Add Phase 4 QA/sign-off pack in:
   - `native/qa/phase4/`
3. Add Phase 5 store-readiness pack in:
   - `native/release/`
4. Link new packs from:
   - `native/apple/README.md`
   - `native/android/README.md`
5. Update conversation/state tracking:
   - `CONVO.md`
   - `SCRATCHPAD.md`

## Acceptance Criteria
- A reviewer can run physical-device VoiceOver/TalkBack checks using only repository docs.
- A reviewer can record and store profiler outputs for 25/50/100MB scenarios in a known structure.
- Apple and Android release gates are represented as explicit checklists with owner/date/evidence columns.
- Native READMEs point to both the sign-off pack and the store packaging pack.
