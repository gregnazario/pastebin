# Shared Backend Risk Audit And Hardening Plan

This plan executes shared-backend risk discovery and remediation for web + Apple + Android clients using a single API backend.

## Objective
- Keep one shared backend (`https://pastebin.sed.fyi`) for web and native clients.
- Detect drift and compatibility regressions early.
- Close security/transport/observability gaps.
- Add continuous CI/release gates so the checks persist beyond one-time auditing.

## Scope
- In scope:
  - API v1 contract verification and capability signaling.
  - Local contract parity checks and client behavioral consistency checks.
  - Staging/production non-destructive smoke checks.
  - Native transport policy hardening (Android cleartext policy, Apple ATS).
  - CI workflow gating and release-checklist integration.
- Out of scope:
  - Backend re-architecture (for example full distributed/global rate limiter migration).
  - Network stack protocol changes beyond additive API enhancements.

## Phase Breakdown
1. Phase 0: Baseline spec + risk register
   - Create execution/design docs.
   - Seed risk register with known hypotheses and severity rubric.
2. Phase 1: Local contract + functional parity audit
   - Validate `/api/v1/health`, `/upload`, `/download`, `/capabilities`.
   - Verify client-side error mapping and boundary validation behavior.
3. Phase 2: Staging/production drift detection
   - Smoke check `health` and `capabilities` for schema/status parity.
   - Verify TLS/host correctness and request trace header behavior.
4. Phase 3: Security + transport risk audit
   - Harden iOS ATS policy.
   - Harden Android cleartext to debug-local-only.
5. Phase 4: Performance + capacity validation
   - Measure endpoint latency and note payload overhead/timeout risks.
6. Phase 5: Remediation backlog + continuous gates
   - Prioritize findings (P0-P3).
   - Add CI PR + scheduled smoke gates.
   - Update native release checklist and project tracking docs.

## Implementation Tasks
1. Backend/API tasks
   - Add `GET /api/v1/capabilities`.
   - Add `X-Request-Id` response header for API traceability.
   - Keep all existing API v1 responses backward compatible.
2. Client observability tasks
   - Add standard optional headers from native API clients:
     - `X-Client-Platform`
     - `X-Client-Version`
     - `X-Request-Id`
3. Transport hardening tasks
   - Android:
     - Add build-variant `network_security_config`.
     - Allow cleartext only on debug local hosts; deny cleartext for release.
   - Apple:
     - Remove `NSAllowsArbitraryLoads`.
     - Use ATS local-networking allowance for development paths.
4. CI and automation tasks
   - Add contract check command and CI job.
   - Add scheduled/manual smoke check job for staging + production.
5. Documentation and tracking tasks
   - Add design and audit report docs.
   - Update release checklist and tracking files.
   - Log security findings/fixes and implementation mistakes when applicable.

## Validation Commands
- Web:
  - `bun run lint`
  - `bun run typecheck`
  - `bun test`
  - `bun run build`
  - `bun run check:api-contract`
  - `bun run check:backend-smoke`
- Apple:
  - `swift test` (in `native/apple`)
  - `xcodebuild -project native/apple/SecurePastebinAppleDemo.xcodeproj -scheme SecurePastebinDemoApp -configuration Debug -destination 'generic/platform=iOS Simulator' build`
- Android:
  - `gradle :core:network:testDebugUnitTest :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:assembleDebugAndroidTest` (in `native/android`)

## Acceptance Criteria
- API v1 includes additive `capabilities` endpoint and remains backward compatible.
- Native clients send standardized optional observability headers.
- Android release disallows cleartext; debug supports local cleartext development.
- Apple ATS no longer permits arbitrary network loads.
- CI includes PR contract gate and scheduled/manual environment smoke checks.
- Release checklist and state/conversation/security/mistake logs are updated.
