# Native Phase 4 Hardening Baseline

This document defines baseline hardening checklists and profiling procedures for native clients.

## Accessibility Baseline Checklist

### Apple (iOS/iPadOS/macOS)
- Verify Dynamic Type scaling at:
  - default
  - accessibility large
  - accessibility extra-extra-extra large
- Verify VoiceOver labels and action discoverability for:
  - Upload controls
  - Decrypt controls (`Save As`, `Export`)
  - History row actions (`Open`, `Share`, `Delete`)
  - Settings sheet actions (`Cancel`, `Apply`, presets)
- Verify keyboard navigation on iPad hardware keyboard and macOS:
  - tab order across form fields and action buttons
  - escape/cancel behavior for modal sheets

### Android
- Verify TalkBack announcements for:
  - tab changes (Upload/Decrypt/History)
  - upload/decrypt submit actions and error messages
  - cloud sync controls and sync status text
- Verify font scale support at:
  - `1.0`
  - `1.3`
  - `1.5`
  - `2.0`
- Verify landscape and split-screen behavior:
  - no clipped primary actions
  - no inaccessible dialog controls

## Privacy + Analytics Payload Audit Baseline

### Denylist (must never be present in analytics payloads)
- plaintext/decrypted file bytes
- password values
- share URL fragments/private keys
- raw uploaded file names when metadata encryption is enabled

### Allowlist (safe event metadata examples)
- operation type (`upload`, `decrypt`, `sync`)
- coarse status (`success`, `failure`, `cancelled`)
- duration buckets
- non-sensitive size buckets (`<1MB`, `1-10MB`, `10-100MB`)

### Audit Procedure
1. Capture outbound analytics payloads in debug/staging builds.
2. Grep payload exports for denylist terms and representative secret patterns.
3. Fail hardening sign-off if any denylist field appears unredacted.

## Large-File Performance Profiling Baseline

### Test Scenarios
- Upload note payload near upper bound.
- Upload file payload at `25MB`, `50MB`, and `100MB`.
- Decrypt payload at matching size tiers.
- Execute one cold run and three warm runs per scenario.

### Android Profiling Procedure
1. Build debug instrumentation target.
2. Use Android Studio Profiler while running localnet scenarios.
3. Record:
   - peak memory
   - main-thread frame jank during encrypt/decrypt
   - total operation duration

### Apple Profiling Procedure
1. Run app from Xcode with Instruments.
2. Use:
   - Time Profiler
   - Allocations
   - Leaks
3. Record:
   - peak resident memory
   - hotspot methods during crypto + preview decode
   - end-to-end operation duration

### Baseline Acceptance Targets (initial)
- No crashes across all scenario tiers.
- No OOM conditions on target reference devices.
- Operation completes within 60s on `100MB` localnet flow.
- No sustained >2s UI unresponsiveness during main user paths.

## Sign-Off Artifacts
- Accessibility checklist results with device/version matrix.
- Privacy audit report including denylist grep evidence.
- Performance profile table (device, scenario, peak memory, duration).
