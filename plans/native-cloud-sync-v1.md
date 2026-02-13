# Native Cloud Sync v1 Plan

This plan delivers v1 cloud history sync adapters for Apple and Android native clients.

## Scope
- Apple native cloud sync adapter using iCloud (`NSUbiquitousKeyValueStore`).
- Android native cloud sync adapter using Google Drive user-selected document URI via Storage Access Framework.
- Shared sync coordinator behavior per platform with conflict tracking and sync state reporting.
- UI action wiring into existing History flows so users can trigger sync and see outcomes.

## Assumptions
- v1 sync scope is history metadata only (not encrypted payload bytes).
- Merge strategy is last-write-wins based on entry recency (`createdAtMillis`) with explicit conflict accounting.
- Deletions are local hard deletes in current model; v1 does not add tombstone replication.

## Steps
1. Add CoreStorage cloud sync models, adapter protocols, and merge/coordinator logic (Apple + Android).
2. Implement Apple iCloud adapter and integrate with History flow/view model.
3. Implement Android Google Drive document adapter and integrate with History tab actions.
4. Add unit tests for merge/coordinator conflict handling on both platforms.
5. Validate builds/tests and update docs/tracking files.

## Validation Targets
- `swift test` in `native/apple`.
- `gradle :core:storage:testDebugUnitTest :feature:history:testDebugUnitTest :app:compileDebugKotlin` in `native/android`.
- `bun run lint`, `bun run typecheck`, `bun test`, `bun run build`.
