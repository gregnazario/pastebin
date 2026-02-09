# Native Release Packaging

This directory contains Phase 5 store-readiness artifacts for Apple and Android.

## Files
- `release-gate-checklist.md`: unified release gate tracker.
- `rollout-plan.md`: staged rollout and rollback protocol.
- `apple/`: App Store Connect metadata and Apple-specific release checklist.
- `android/`: Play Console metadata and Android-specific release checklist.

## Rule
- A release is ready only when all mandatory rows are complete in:
  - `release-gate-checklist.md`
  - `apple/release-checklist.md`
  - `android/release-checklist.md`
