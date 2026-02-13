# Web Upload Buffer Runtime Fix Plan

This plan fixes upload failures caused by Node-specific `Buffer` usage and enforces SDK target separation (`browser` for browser-reachable code, `node` for backend-only operations).

## Objective
- Eliminate runtime dependency on `Buffer` during upload commitment generation.
- Preserve existing upload behavior for web and native clients.
- Add regression coverage to prevent reintroduction.

## Scope
- In scope:
  - `src/server/shelby.ts` upload commitment input handling.
  - Unit test coverage for upload commitment input type.
  - Project tracking updates for this bug and fix.
- Out of scope:
  - Shelby protocol/API changes.
  - Upload payload format changes.

## Implementation Steps
1. Replace `Buffer.from(data)` with `Uint8Array` input in upload commitment generation.
2. Update Shelby imports so browser-reachable code uses `@shelby-protocol/sdk/browser`, while backend client construction loads `@shelby-protocol/sdk/node`.
3. Add unit test that mocks Shelby + Aptos dependencies and verifies `generateCommitments` receives `Uint8Array`.
4. Run validation commands:
   - `bun run test`
   - `bun run typecheck`
   - `bun run build`
5. Update tracking docs:
   - `CONVO.md`
   - `SCRATCHPAD.md`
   - `MISTAKE_FIXES.md`

## Acceptance Criteria
- Upload path no longer references `Buffer` for commitment generation.
- Browser-reachable code path uses browser SDK exports; backend-only client wiring uses node SDK.
- Unit tests pass with explicit assertion of `Uint8Array` commitment input.
- Typecheck and build complete successfully.
