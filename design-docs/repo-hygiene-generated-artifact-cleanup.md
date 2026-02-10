# Repo Hygiene: Generated Artifact Cleanup

This design documents the cleanup strategy for generated artifacts that should not live in source control.

## Problem
A prior catch-all commit introduced large generated trees (Android/Apple build caches and Vercel output), including embedded git checkouts under SwiftPM build output.

## Decision
- Keep source, docs, and intentional project files tracked.
- Remove generated output from tracking using `git rm --cached`.
- Add explicit ignore rules at the root to block recurrence.

## Paths to Untrack
- `.vercel/output/`
- `native/android/.gradle/`
- `native/android/.kotlin/`
- `native/android/**/build/`
- `native/apple/.build/`
- `native/apple/.swiftpm/`
- `native/apple/**/xcuserdata/`

## Outcome
After cleanup, clones remain lightweight and no embedded build-time git repositories are stored in main history moving forward.
