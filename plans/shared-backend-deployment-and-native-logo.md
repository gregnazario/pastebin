# Shared Backend Deployment And Native Logo Plan

This plan closes the two remaining shared-backend blockers and ensures Pastebin branding appears in native apps.

## Goals
- Resolve blocker 1: production `/api/v1/*` routing/deployment drift.
- Resolve blocker 2: staging reachability gap via explicit deploy + alias path.
- Ensure Pastebin logo is visible in Apple and Android native apps.

## Scope
- CI/deployment automation for Vercel production and staging.
- Native app UI/asset updates for logo branding.
- Documentation and state tracking updates.

## Implementation Steps
1. Deployment automation:
   - Add GitHub workflow to deploy production from `main`.
   - Add GitHub workflow to deploy staging from `staging` branch and set alias/domain.
   - Use prebuilt Vercel output (`VERCEL=1 bun run build`) to preserve Nitro routing.
2. Backend parity verification:
   - Keep `check:backend-smoke` for production+staging non-destructive checks.
   - Document required repository secrets for deployment workflows.
3. Android logo integration:
   - Add logo image resource in `app/src/main/res`.
   - Show logo in top shell card.
   - Set launcher icon metadata to logo asset.
4. Apple logo integration:
   - Add logo asset under app sources/resources.
   - Render logo in root shell header.
5. Validation:
   - `bun run lint`
   - `bun run typecheck`
   - `bun test`
   - `bun run build`
   - `swift test`
   - `xcodebuild ... SecurePastebinDemoApp ...`
   - `gradle :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:assembleDebugAndroidTest`
   - `bun run check:backend-smoke` (expected to pass once deployment secrets and DNS alias are configured)

## Acceptance Criteria
- Repo includes production and staging deploy workflows with clear secret requirements.
- Native app shells visibly include the Pastebin logo.
- Android launcher icon references Pastebin logo.
- All local validation checks pass.
- Tracking docs (`CONVO.md`, `SCRATCHPAD.md`) include rollout details and remaining external dependencies (if any).
