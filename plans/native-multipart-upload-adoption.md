# Native Multipart Upload Adoption Plan

## Objective
Move Apple and Android native upload transports from JSON byte arrays to multipart form uploads for `/api/v1/upload`.

## Why
- Native uploads currently serialize encrypted payload bytes as JSON arrays, which inflates request size.
- Inflated payloads increase risk of upstream function payload limits (`413 FUNCTION_PAYLOAD_TOO_LARGE`) on mobile.
- Backend now supports multipart and octet-stream; native clients should consume that path.

## Scope
- Apple networking client (`CoreNetworking`) upload request body format.
- Android networking client (`core/network`) upload request body format.
- Unit tests for request shape and header behavior.

## Non-Goals
- Compression implementation.
- Upload API endpoint shape changes.
- Native crypto payload format changes.

## Steps
1. Apple:
   - Replace JSON upload body with `multipart/form-data` body construction.
   - Keep observability headers (`X-Client-*`, `X-Request-Id`).
   - Add unit test asserting multipart content-type and body structure.
2. Android:
   - Replace JSON upload body with multipart boundary + binary file part.
   - Keep observability headers.
   - Add unit test for multipart body builder format.
3. Validation:
   - Apple tests (`swift test`).
   - Android core network unit tests.
   - Web checks (`bun run lint`, `bun run typecheck`, `bun run build`) to ensure no regressions.

## Risks
- Multipart body formatting errors can break uploads.
  - Mitigation: deterministic unit tests around boundary/body construction.
- Filename encoding/newline injection risks.
  - Mitigation: sanitize multipart filename values before serialization.
