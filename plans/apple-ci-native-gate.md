# Apple Native CI Gate Plan

This plan adds a macOS CI gate for native Apple validation.

## Goals
- Validate native Apple package tests in CI.
- Validate iOS simulator app build in CI.
- Keep existing web and Android jobs unchanged.

## Scope
- `.github/workflows/ci.yml`
- `design-docs/apple-ci-native-gate.md`
- Tracking docs (`CONVO.md`, `SCRATCHPAD.md`)

## Steps
1. Add design doc with runner, commands, and failure diagnostics.
2. Extend CI workflow with a new `apple-native` job on macOS:
   - run `swift test` in `native/apple`
   - run `xcodebuild` iOS simulator build for `SecurePastebinDemoApp`
3. Validate workflow syntax and run matching local commands.
4. Update tracking docs.

## Acceptance Criteria
- CI includes Apple native job.
- Job runs Swift package tests and simulator build.
- Existing jobs remain unchanged.
