# SecuPaste

SecuPaste is a post-quantum encrypted file and note sharing app.

It provides:
- Web app (TanStack Start + Vite/Nitro)
- Native Apple app shell (Swift, iOS/iPadOS now, macOS follow-on)
- Native Android app shell (Kotlin + Compose)
- Shared backend API (`/api/v1/*`) used by web + native clients

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

## Backend Base URL

Default production base URL for web and native clients:

- `https://pastebin.sed.fyi`

Native apps also support local/staging/runtime override via in-app settings.

## Notes

- E2E testing is restricted to local environments.
- If you hit `413 FUNCTION_PAYLOAD_TOO_LARGE`, verify client is on latest build (multipart upload path) and confirm host function body limits.
