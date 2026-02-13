# Phase 4 Profiling Metrics

This table captures profiling outputs for large-file localnet scenarios.

## Instructions
- For each row, run one cold and three warm runs.
- Attach profiler exports under `native/qa/phase4/evidence/`.
- Record worst-case memory and duration observed.

| Platform | Device | Scenario | Payload Size | Cold Duration (s) | Warm P95 Duration (s) | Peak Memory (MB) | UI Stall >2s (Y/N) | Result | Evidence Path |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Apple | TBD | Upload | 25MB | TBD | TBD | TBD | TBD | Pending | `native/qa/phase4/evidence/apple/` |
| Apple | TBD | Upload | 50MB | TBD | TBD | TBD | TBD | Pending | `native/qa/phase4/evidence/apple/` |
| Apple | TBD | Upload | 100MB | TBD | TBD | TBD | TBD | Pending | `native/qa/phase4/evidence/apple/` |
| Apple | TBD | Decrypt | 25MB | TBD | TBD | TBD | TBD | Pending | `native/qa/phase4/evidence/apple/` |
| Apple | TBD | Decrypt | 50MB | TBD | TBD | TBD | TBD | Pending | `native/qa/phase4/evidence/apple/` |
| Apple | TBD | Decrypt | 100MB | TBD | TBD | TBD | TBD | Pending | `native/qa/phase4/evidence/apple/` |
| Android | TBD | Upload | 25MB | TBD | TBD | TBD | TBD | Pending | `native/qa/phase4/evidence/android/` |
| Android | TBD | Upload | 50MB | TBD | TBD | TBD | TBD | Pending | `native/qa/phase4/evidence/android/` |
| Android | TBD | Upload | 100MB | TBD | TBD | TBD | TBD | Pending | `native/qa/phase4/evidence/android/` |
| Android | TBD | Decrypt | 25MB | TBD | TBD | TBD | TBD | Pending | `native/qa/phase4/evidence/android/` |
| Android | TBD | Decrypt | 50MB | TBD | TBD | TBD | TBD | Pending | `native/qa/phase4/evidence/android/` |
| Android | TBD | Decrypt | 100MB | TBD | TBD | TBD | TBD | Pending | `native/qa/phase4/evidence/android/` |

## Acceptance Targets
- No crashes or OOM at any size tier.
- 100MB upload/decrypt completes within 60 seconds in localnet.
- No sustained UI unresponsiveness over 2 seconds in core flows.
