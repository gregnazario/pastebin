# Android Instrumentation Failure Artifact Upload Plan

This plan adds CI artifact uploads for Android instrumentation failures.

## Goals
- Preserve instrumentation diagnostics when CI fails.
- Capture standard Android test reports/results and any screenshots.
- Keep successful runs unchanged and lightweight.

## Scope
- `.github/workflows/ci.yml`
- `design-docs/android-instrumentation-failure-artifacts.md`
- Tracking docs (`CONVO.md`, `SCRATCHPAD.md`)

## Steps
1. Add design doc describing artifact policy and paths.
2. Extend `android-instrumentation` job in CI:
   - add `actions/upload-artifact@v4` step
   - run only on failure (`if: failure()`)
   - upload androidTest report/result/screenshot directories
3. Validate workflow syntax.
4. Run standard repo validation commands.
5. Update tracking docs.

## Acceptance Criteria
- On instrumentation job failure, artifacts are uploaded automatically.
- Artifact step does not run on success.
- Workflow remains valid and existing jobs unchanged.
