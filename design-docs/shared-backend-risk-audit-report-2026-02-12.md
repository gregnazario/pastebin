# Shared Backend Risk Audit Report (2026-02-12)

This report captures execution results for the shared backend risk discovery and hardening rollout.

## Phase 1: Local Contract + Functional Parity Audit

## Compatibility Matrix
Legend: `PASS` = automated evidence present, `PARTIAL` = partial evidence, `PENDING` = manual run required.

| Scenario | Web | Apple | Android | Notes |
| --- | --- | --- | --- | --- |
| `GET /api/v1/health` success contract | PASS | PASS | PASS | Web route tests + Apple/Android API client tests validate request path and decode path. |
| `GET /api/v1/capabilities` success contract | PASS | PARTIAL | PARTIAL | Web unit test validates payload shape; native clients not yet invoking endpoint directly. |
| `POST /api/v1/upload` method enforcement | PASS | PARTIAL | PARTIAL | Web API routing tests cover 405 behavior; native integration covered by existing upload flow tests, not explicit endpoint-level parity test. |
| `GET /api/v1/download` method enforcement | PASS | PARTIAL | PARTIAL | Web API routing tests cover 405 behavior; native integration covered by decrypt/history flows. |
| Invalid request schema handling | PASS | PARTIAL | PARTIAL | Web tests + shared validators enforce 400 mapping; native explicit schema-negative tests pending. |
| Malformed file-id handling | PARTIAL | PENDING | PENDING | Backend validator exists; dedicated native malformed-id scenario still pending full E2E pass. |
| Rate-limit threshold behavior | PARTIAL | PENDING | PENDING | Logic present in backend; threshold E2E test matrix pending distributed environment harness. |
| Client error mapping consistency | PASS | PARTIAL | PARTIAL | Web `mapApiErrorStatus` tests pass; native side has baseline decode/transport tests with expanded mapping backlog item. |

## Phase 2: Staging/Production Drift Detection (Smoke)

Executed command:
- `bun run check:backend-smoke`

Results:

| Target | Endpoint | Status | Latency (ms) | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| `https://pastebin.sed.fyi` | `/api/v1/health` | `404` | `203` | FAIL | API v1 endpoint unavailable on production host. |
| `https://pastebin.sed.fyi` | `/api/v1/capabilities` | `404` | `52` | FAIL | New capability endpoint unavailable on production host. |
| `https://staging.pastebin.sed.fyi` | `/api/v1/health` | `0` | `1` | FAIL | Host unreachable from smoke environment. |
| `https://staging.pastebin.sed.fyi` | `/api/v1/capabilities` | `0` | `0` | FAIL | Host unreachable from smoke environment. |

Actionable drift findings:
1. Production routing/config does not currently expose `/api/v1/*` (`P1`).
2. Staging availability/DNS/network path appears broken (`P1`).
3. Shared-backend rollout should remain `NO-GO` until these are resolved and smoke checks pass.

## Phase 3: Security + Transport Risk Audit

Implemented hardening:
1. Apple ATS tightened:
   - Removed broad `NSAllowsArbitraryLoads`.
   - Kept `NSAllowsLocalNetworking` for local development support.
2. Android cleartext policy narrowed:
   - Debug-only local cleartext hosts allowed via `network_security_config`.
   - Release cleartext denied globally.
3. Observability headers standardized on native:
   - `X-Client-Platform`
   - `X-Client-Version`
   - `X-Request-Id`
4. API traceability improved:
   - API responses now include `X-Request-Id`.

Residual risk accepted for now:
- In-memory per-instance rate limiting remains (`P1` at scale, `P2` at current scale).

## Phase 4: Performance + Capacity Validation

Measured signals:
- Production `404` responses returned quickly after network handshake (`53-921ms`) but do not validate success-path latency.
- No successful staging/prod upload/download latency samples were possible due endpoint availability drift.

Capacity risk status:
- JSON byte-array payload overhead for near-100MB uploads remains a known risk (`P1`) until binary/streaming path or hard empirical success-path benchmarks are added.

## Phase 5: Remediation Backlog + Continuous Gates

## Prioritized Backlog
| Priority | Finding | Owner | Target |
| --- | --- | --- | --- |
| P1 | Fix production routing so `/api/v1/health` and `/api/v1/capabilities` return 200 | Platform | Immediate |
| P1 | Restore staging reachability and verify TLS/host configuration | Platform | Immediate |
| P1 | Add native explicit tests for malformed-id and schema-negative endpoint behavior | Native | Short-term |
| P2 | Add richer client-side retry/backoff instrumentation for transient errors | Native/Web | Short-term |
| P2 | Improve rate-limit fairness strategy for shared NAT clients | Backend | Medium-term |
| P1 | Move rate limiter from in-memory to shared distributed store for multi-instance consistency | Backend | Medium-term |
| P1 | Prototype binary/stream upload contract to reduce JSON payload overhead | Backend/Clients | Medium-term |

## Continuous Gates Added
1. PR gate:
   - `bun run check:api-contract` in CI (`.github/workflows/ci.yml`).
2. Scheduled/manual smoke gate:
   - `.github/workflows/backend-smoke.yml`
   - Runs `bun run check:backend-smoke` against production + staging.
3. Release gate integration:
   - Added shared-backend checks to `native/release/release-gate-checklist.md`.

## Go / No-Go Scorecard
| Gate | Status |
| --- | --- |
| Local contract and regression checks | PASS |
| Native observability header standardization | PASS |
| Transport hardening (Apple + Android) | PASS |
| Production smoke parity | FAIL |
| Staging smoke parity | FAIL |
| Continuous CI smoke/contract gates installed | PASS |

Final recommendation: **NO-GO** until production/staging endpoint parity issues are resolved and smoke checks pass.
