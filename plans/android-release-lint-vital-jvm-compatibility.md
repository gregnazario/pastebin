# Android Release Lint-Vital JVM Compatibility Plan

This plan restores `:app:assembleRelease` without command-line lint task exclusions while preserving lint checks on supported JVMs.

## Goals
- Keep release builds unblocked on JVM 24+ where AGP 8.6.1 lint crashes.
- Preserve release lint-vital checks on supported JVM runtimes.
- Document the behavior in Android workspace docs.

## Scope
- `native/android/build.gradle.kts`
- `native/android/README.md`
- Tracking docs (`CONVO.md`, `SCRATCHPAD.md`, `MISTAKE_FIXES.md`)

## Steps
1. Reproduce `gradle :app:assembleRelease` failure and capture root cause evidence.
2. Add centralized Android lint configuration in root Gradle script:
   - detect current JVM major version
   - set `checkReleaseBuilds = false` only on JVM 24+
   - keep `checkReleaseBuilds = true` for supported JVMs
3. Validate:
   - `gradle :app:assembleRelease` on current JVM 25 runtime
   - `JAVA_HOME=<jdk23> gradle :app:lintVitalRelease` to verify lint still runs
4. Document behavior and command evidence in project tracking files.

## Acceptance Criteria
- `gradle :app:assembleRelease` succeeds without `-x lintVital*` exclusions.
- Lint-vital remains runnable on JVM 23 (or other supported versions).
- Root cause and mitigation are documented for future AGP upgrades.
