# Repo Hygiene Generated Artifact Cleanup Plan

This plan removes generated artifacts accidentally committed into the repository and prevents recurrence.

## Goals
- Remove build/cache/deployment output from git tracking.
- Preserve real source/docs while untracking generated files.
- Add ignore rules that block re-introduction.

## Scope
- `.vercel/output`
- Native Android build/cache directories
- Native Apple SwiftPM/Xcode derived directories

## Steps
1. Add design note in `design-docs/`.
2. Update root `.gitignore` with explicit generated-artifact rules.
3. Untrack generated directories with `git rm --cached`.
4. Verify clean tracking state.
5. Update `CONVO.md` and `SCRATCHPAD.md`.

## Acceptance Criteria
- No generated artifact directories remain tracked.
- `.gitignore` covers the removed paths.
- Working tree remains clean aside from intended local untracked outputs.
