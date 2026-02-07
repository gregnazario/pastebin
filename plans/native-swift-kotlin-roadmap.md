# Native Swift + Kotlin Roadmap

## Purpose
This document defines the implementation plan to build fully native Apple apps (iOS, iPadOS, macOS in Swift) and a fully native Android app (Kotlin) with feature parity to the current web app.

## Goal
Ship production native apps with the same core functionality as the web app:
- Upload encrypted files and text notes.
- Decrypt/download with password + key fragment.
- Local history management.
- Metadata encryption option.
- Password policy and secure password generation.
- Security-first UX and error handling.

## Confirmed Tradeoff Decisions (2026-02-07)
These decisions are user-approved and now drive scope and sequencing:

1. Crypto implementation core: **A** (native Swift + Kotlin with shared conformance vectors).
2. Backend contract: **A** (versioned REST API for native clients).
3. v1 parity scope: **B** (core parity first, then docs/onboarding extras).
4. History sync in v1: **B** (include iCloud + Google Drive sync in v1).
5. Link expiration policy: **A** (fixed server default).
6. File size limit: **A** (keep 100MB parity).
7. Preview support in v1: **B** (add PDF/media preview in v1).
8. Password policy strictness: **B** (slightly relaxed mobile UX policy).
9. Release order: **B** (Apple + Android parallel).
10. macOS strategy: **B** (defer macOS until iOS/iPadOS stabilize).
11. Telemetry/privacy: **B** (richer product analytics events).
12. Windows stretch: **B** (defer until after iOS+Android GA).

## Current Web Parity Baseline
The native apps must match these existing web behaviors:
- 100MB max file upload.
- Note mode with optional title and large text payload.
- Password validation (length, character classes, entropy, common patterns).
- Optional metadata encryption.
- ML-KEM-768 + AES-256-GCM + Argon2id encryption pipeline.
- Share URL format `.../p/{id}#{base64url_private_key}`.
- Decrypt flow with password + URL fragment key.
- Text and image preview after decrypt (size-limited).
- Local paste history (add/list/remove/clear/expiry handling).
- Security notices around key handling.

## Scope Guardrails from Decisions
- Core-first v1 means upload/decrypt/history/sync/security ship first; docs/onboarding polish follows in a short post-v1 track.
- Relaxed password UX must still preserve baseline security:
  - Minimum length remains at least 12.
  - Common-password/pattern rejection remains enabled.
  - Any relaxation must be documented and benchmarked for risk.
- Rich analytics must explicitly exclude:
  - Passwords.
  - Private key fragments.
  - Decrypted payload data.

## Delivery Phases

### Phase 0: Contract and Scope Freeze (1-2 weeks)
- Freeze feature parity list against current web behavior.
- Resolve currently inconsistent expiration messaging (web copy says 24h in places, server default is 30 days).
- Define canonical API contract for native clients.
- Produce crypto test vectors from current web implementation.

Deliverables:
- Signed-off parity checklist.
- API schema doc and example payloads.
- Crypto conformance vector pack.

### Phase 1: Shared Security Specification (1-2 weeks)
- Formalize binary payload format and key encoding rules.
- Define Argon2id parameters and compatibility requirements.
- Define error taxonomy (invalid password, corrupted payload, missing key, not found, expired).

Deliverables:
- `encryption-spec-v1.md` in `design-docs/`.
- Cross-platform compatibility test cases.

### Phase 2: Native Foundation (Apple + Android, parallel, 4-6 weeks)
- Create Swift package structure:
  - `CoreCrypto`
  - `CoreNetworking`
  - `CoreStorage`
  - `FeatureUpload`, `FeatureView`, `FeatureHistory`
- Build SwiftUI app targets:
  - iOS and iPadOS (universal)
- Implement deep-link parsing for `p/{id}#{key}`.
- Create Kotlin modular architecture:
  - `core:crypto`
  - `core:network`
  - `core:storage`
  - `feature:upload`, `feature:view`, `feature:history`
- Implement Jetpack Compose UI and navigation.
- Implement intent/deep-link handling for shared links.
- Stand up native analytics event pipeline with privacy allowlist.

Deliverables:
- Running iOS/iPadOS app with upload and decrypt happy path.
- Running Android app with upload and decrypt happy path.
- Unit tests and instrumentation setup.

### Phase 3: Core-First v1 Completion (3-4 weeks)
- Implement note mode, metadata encryption toggle, progress UX, history UX.
- Implement cloud sync in v1 (iCloud for Apple, Google Drive for Android).
- Implement password generator and adjusted mobile policy enforcement.
- Implement text/image preview plus PDF/media preview in v1.
- Implement security warnings, copy/share controls, analytics instrumentation, and error parity.

Deliverables:
- Core-first parity matrix marked complete for all v1 flows.
- End-to-end localnet test pass across Apple and Android.

### Phase 4: Hardening and QA (2-3 weeks)
- Performance profiling for large files and memory pressure.
- Backgrounding/interruption safety.
- Accessibility pass:
  - Dynamic type / font scaling.
  - VoiceOver/TalkBack labels.
  - Keyboard and pointer support on iPad/macOS.
- Security pass:
  - Key material lifecycle in memory.
  - Logs and crash reports scrubbed of secrets.
- Privacy pass:
  - Analytics taxonomy review and data minimization checks.

Deliverables:
- Security checklist sign-off.
- Accessibility checklist sign-off.
- Privacy checklist sign-off.
- Release candidate builds.

### Phase 5: Store Readiness and Rollout (1-2 weeks)
- App Store / Play Store metadata and privacy disclosures.
- Phased rollout with crash and performance monitoring.
- Post-launch bug fix sprint.

Deliverables:
- Public release builds.
- Operations runbook and monitoring dashboard.

### Phase 6: Post-GA Expansion (2-4 weeks)
- Add macOS native target after iOS/iPadOS stabilization.
- Deliver docs/onboarding parity and remaining polish features.
- Re-evaluate Windows after Apple + Android GA stabilization window.

## Testing Strategy
- Unit tests:
  - Crypto primitives and payload parsing.
  - Password validator and generator.
  - URL/deep link parser and file ID validation.
- Integration tests:
  - Upload/decrypt workflows against local backend.
  - History storage behavior and expiry cleanup.
- E2E tests:
  - Localnet only.
  - Real file upload/decrypt/download flows.
- Cross-platform conformance:
  - Encrypt on web, decrypt on native.
  - Encrypt on iOS/Android, decrypt on web.

## Suggested Milestones
1. Milestone A: Apple + Android prototypes complete (end of Phase 2).
2. Milestone B: Core-first v1 feature complete (end of Phase 3).
3. Milestone C: Production mobile release (end of Phase 5).
4. Milestone D: macOS follow-on release (end of Phase 6).

## Stretch Goal: Windows
- Preferred approach: native WinUI 3 app in C# with matching API and crypto spec.
- Scope for stretch release:
  - Open link/decrypt.
  - Upload file/note.
  - Local history.
- Explicitly deferred until after iOS+Android GA and stabilization.

## Risks and Mitigations
- Crypto divergence between platforms:
  - Mitigation: spec-first + mandatory test vectors in CI.
- API drift from web backend:
  - Mitigation: stable versioned API contract and compatibility tests.
- Large file memory pressure on mobile:
  - Mitigation: streaming where possible, strict progress staging, stress tests.
- Inconsistent UX across platforms:
  - Mitigation: parity acceptance checklist and shared UX copy catalog.
