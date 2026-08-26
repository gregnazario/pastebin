# SecuPaste

<p align="left">
  <img src="public/logo.svg" width="96" alt="SecuPaste logo">
</p>

[![CI](https://github.com/gregnazario/pastebin/actions/workflows/ci.yml/badge.svg)](https://github.com/gregnazario/pastebin/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

Post-quantum encrypted note and file sharing. Paste something, get a link —
everything is encrypted on your device before it ever touches the server,
and the decryption key never leaves it.

**[Live instance →](https://pastebin.sed.fyi)**

## Why it's private by design

- Encryption and decryption happen entirely client-side; the server only
  ever sees ciphertext (never plaintext or passwords)
- Hybrid post-quantum encryption: ML-KEM (Kyber) + AES-256-GCM
- Argon2id password-based key derivation for optional passwords
- Optional metadata encryption (filename/mime metadata)
- The decryption key stays in the URL fragment (`#...`), which browsers
  never send to the server

Anyone with the link can decrypt. Without the fragment, neither the server
nor anyone else can read the content.

## What ships here

- Web app (TanStack Start + Vite/Nitro), live at
  [pastebin.sed.fyi](https://pastebin.sed.fyi)
- Native Apple app shell (Swift, iOS/iPadOS now, macOS follow-on)
- Native Android app shell (Kotlin + Compose)
- Shared backend API (`/api/v1/*`) used by web + native clients

---

## Security Model

- Client-side encryption/decryption (server never sees plaintext/password)
- ML-KEM (Kyber) + AES-256-GCM hybrid encryption
- Argon2id password-based key derivation
- Optional metadata encryption (filename/mime metadata)
- Decryption key stays in URL fragment (`#...`)

## Current Upload Transport

- Backend `POST /api/v1/upload` accepts:
  - `application/json` (legacy compatibility)
  - `multipart/form-data` (preferred)
  - `application/octet-stream`
- Web uploads use multipart
- iOS uploads use multipart
- Android uploads use multipart

## Limits And Defaults

- Max upload size: `100 MB` (`104,857,600` bytes)
- Max note size (web note mode): `10 MB`
- Default expiration: `30 days` unless `DEFAULT_EXPIRATION_DAYS` is overridden

## Share Key Fragment Format

- New links use `k2.` URL-stable encoding
- Backward-compatible decode still supports:
  - `k1.` links
  - legacy unprefixed base64url links

## Repository Layout

- `src/` web app + server handlers
- `native/apple/` Swift native modules + demo host app
- `native/android/` Kotlin native modules + app
- `shared/` shared assets/vectors
- `plans/` implementation plans
- `design-docs/` design/architecture docs
- `notes/` working notes and fix logs

## Backend Base URL

Default production base URL for web and native clients:

- `https://pastebin.sed.fyi`

Native apps also support local/staging/runtime override via in-app settings.

## Blob Storage

The server stores **ciphertext only**. Client-side ML-KEM + AES-256-GCM encryption is unchanged.

| Environment | Backend | Config |
| --- | --- | --- |
| Local dev (default) | Filesystem | `.data/blobs` (no credentials) |
| Tests | In-memory | `BLOB_STORE=memory` |
| Production (required on Vercel) | S3-compatible | Cloudflare R2 recommended |

Vercel/Lambda/Netlify **must** set S3/R2 credentials. The server will not auto-use `/tmp` (that would accept uploads and then lose them). `BLOB_STORE=filesystem` is an explicit opt-in and is not durable on serverless.

Cloudflare R2 free-tier example:

```
BLOB_STORE=s3
S3_BUCKET=secupaste
S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=true
```

Add an object lifecycle rule on prefix `pastes/` that expires objects after `DEFAULT_EXPIRATION_DAYS` (default 30). Read-path deletion only covers blobs that are fetched again.

The same variables work with Backblaze B2 and MinIO. See `.env.example`.

## Local Development

### Web

```bash
bun install
bun run dev
```

### Build / Check

```bash
bun run lint
bun run typecheck
bun test
bun run build
```

### Apple Native

```bash
cd native/apple
swift test
```

Optional iOS simulator build:

```bash
xcodebuild -project SecurePastebinAppleDemo.xcodeproj -scheme SecurePastebinDemoApp -configuration Debug -destination 'generic/platform=iOS Simulator' build
```

### Android Native

```bash
gradle -p native/android :app:assembleDebug
gradle -p native/android :core:network:testDebugUnitTest
```

### API Contract Check

```bash
bun run check:api-contract
```

## Notes

- E2E testing is restricted to local environments.
- If you hit `413 FUNCTION_PAYLOAD_TOO_LARGE`, verify client is on latest build (multipart upload path) and confirm host function body limits.

## License

Apache-2.0 — see [LICENSE](LICENSE).
