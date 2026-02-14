# API v1 Multipart Upload Hardening Plan

## Objective
Ensure the Pastebin backend and web client handle multipart uploads correctly end-to-end, while keeping existing JSON clients backward compatible.

## Scope
- Backend: `POST /api/v1/upload` request parsing and validation.
- Web client: upload transport from JSON byte array to multipart form upload.
- Contract docs: OpenAPI updates for accepted upload content types.
- Tests: parsing/validation regression tests for JSON, multipart, and octet-stream inputs.

## Non-Goals
- Changing encrypted payload format.
- Changing Shelby on-chain registration flow.
- Enabling non-local E2E tests.

## Implementation Steps
1. Add upload request parser in `src/server/apiV1.ts` with content-type routing:
   - `application/json` (existing behavior)
   - `multipart/form-data` (new)
   - `application/octet-stream` with filename in query/header (new)
2. Keep `validateUploadBlobRequest(...)` as the single source of truth for bounds and schema checks.
3. Add 415 mapping for unsupported media types.
4. Switch web upload transport in `src/services/FileEncryptionService.ts` to multipart form data.
5. Update OpenAPI contract in `design-docs/native-api-v1-openapi.yaml`.
6. Add unit tests for new parser behavior in `src/server/apiV1.test.ts`.
7. Run lint/typecheck/tests/build and update state tracking docs.

## Risks And Mitigations
- Risk: Native clients relying on JSON uploads break.
  - Mitigation: Keep JSON path fully supported.
- Risk: Multipart parsing may omit filename.
  - Mitigation: Require explicit `filename` or fallback to file part name.
- Risk: Large payload request overhead remains on JSON clients.
  - Mitigation: Multipart now available and used by web; native migration can be incremental.

## Compression Decision Criteria
- If payload is already encrypted, compression after encryption will not help.
- Consider optional compression before encryption only for highly compressible text payloads and only when net size gain exceeds a threshold.
