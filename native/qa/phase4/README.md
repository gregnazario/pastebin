# Phase 4 Native Hardening Sign-Off Runbook

This runbook defines the required manual evidence for final Phase 4 hardening sign-off.

## Purpose
- Complete physical-device accessibility validation on Apple and Android.
- Capture profiler evidence for 25MB, 50MB, and 100MB upload/decrypt flows.
- Record privacy audit evidence with denylist checks.

## Required Artifacts
- `device-matrix.md`
- `accessibility-checklist.md`
- `profiling-metrics.md`
- `privacy-audit-evidence.md`

## Evidence Storage
- Store screenshots, screen recordings, and profiler exports under:
  - `native/qa/phase4/evidence/`
- Keep only non-sensitive artifacts. Do not store plaintext user content, passwords, or private key fragments.

## Execution Order
1. Fill target devices in `device-matrix.md`.
2. Run accessibility checks:
   - iPhone + iPad with VoiceOver.
   - Android phone/tablet with TalkBack.
3. Run profiling scenarios:
   - Upload and decrypt: 25MB, 50MB, 100MB.
4. Run privacy scans and record output snippets in `privacy-audit-evidence.md`.
5. Mark sign-off rows complete with owner/date/evidence path.

## Apple Device Guidance
1. Use physical device build from Xcode (`SecurePastebinDemoApp`).
2. Enable VoiceOver and verify:
   - tab navigation labels
   - upload/decrypt control announcements
   - history row actions and settings sheet actions
3. Profile using Instruments:
   - Time Profiler
   - Allocations
   - Leaks
4. Export traces and link paths in `profiling-metrics.md`.

## Android Device Guidance
1. Install debug build:
   - `gradle :app:installDebug`
2. Enable TalkBack and verify:
   - tab announcements
   - action and error announcement clarity
   - dialog control reachability at larger font scales
3. Profile using Android Studio Profiler:
   - CPU and Memory during upload/decrypt scenarios
4. Export profiler artifacts and link paths in `profiling-metrics.md`.

## Sign-Off Rule
- Phase 4 is complete only when all rows in each checklist are filled and include evidence references.
