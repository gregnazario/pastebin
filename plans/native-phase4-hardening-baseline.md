# Native Phase 4 Hardening Baseline Plan

This plan introduces executable baseline artifacts for Phase 4 hardening work.

## Goals
- Define concrete accessibility, privacy, and performance hardening checklists.
- Provide repeatable profiling commands for large-file native flows.
- Make the workflow discoverable through platform READMEs.

## Scope
- Documentation only (no production behavior changes):
  - `design-docs/native-phase4-hardening-baseline.md`
  - native platform README references

## Steps
1. Add hardening baseline design doc with:
   - accessibility checklist for iOS/iPadOS/macOS and Android
   - analytics/privacy payload audit rules and denylist
   - large-file profiling scenarios and acceptance thresholds
2. Link the hardening doc from:
   - `native/apple/README.md`
   - `native/android/README.md`
3. Validate repository health:
   - `swift test`
   - Android unit + instrumentation suite
   - `bun run lint`, `bun run typecheck`, `bun test`, `bun run build`
