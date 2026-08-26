# Plan: Free Blob Storage Backend

## Goal

Swap Shelby/Aptos blob persistence for a free filesystem + S3-compatible backend without changing client encryption or the native/web API.

## Steps

1. Add `BlobStore` adapters (`memory`, `filesystem`, `s3`) in `src/server/storage.ts` with unit tests.
2. Replace `src/server/shelby.ts` with `src/server/blobs.ts` that keeps validation, rate limits, IDs, and `/api/v1` handlers.
3. Point `src/server/apiV1.ts` at the new module.
4. Remove Shelby/Aptos dependencies, `clay.wasm` copy plugin, and Shelby env vars.
5. Tighten CSP / HTML preconnect so browsers no longer talk to Shelby.
6. Update user-facing copy (home, docs, README) so it no longer claims decentralized Shelby storage.
7. Document R2/S3 configuration in `.env.example` and README.
8. Run `bun run lint`, `bun run typecheck`, `bun test`, `bun run build`, `bun run check:api-contract`.

## Verification

- Upload then download round-trip of ciphertext bytes through memory and filesystem adapters.
- Expired objects are treated as missing.
- Health remains `{ configured, account }`.
- OpenAPI contract snippets still pass.
- Build no longer requires `clay.wasm`.
