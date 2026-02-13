# Android CI Release Lint Enforcement Plan

This plan adds Android CI coverage that runs release assembly and release lint on a supported JVM.

## Goals
- Enforce Android release quality checks in CI.
- Ensure `lintVitalRelease` runs on a JVM version compatible with AGP 8.6.1.
- Keep current web/Bun CI jobs unchanged.

## Scope
- `.github/workflows/ci.yml`
- `design-docs/android-ci-release-lint-enforcement.md`
- Tracking docs (`CONVO.md`, `SCRATCHPAD.md`)

## Steps
1. Add design doc describing CI job behavior and runtime/toolchain constraints.
2. Extend CI workflow with an Android release validation job that:
   - sets up JDK 23
   - prepares Android SDK tooling
   - runs `gradle :app:assembleRelease`
   - runs `gradle :app:lintVitalRelease`
3. Validate workflow syntax and repository state locally.
4. Update conversation/state tracking docs.

## Acceptance Criteria
- CI workflow includes an Android release job.
- Android release lint checks run on JDK 23.
- Existing Bun jobs continue unchanged.
