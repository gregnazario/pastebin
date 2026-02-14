# Docs + README Current-State Refresh Design

## Summary
Bring project documentation in line with the current SecuPaste implementation to reduce operator and contributor confusion.

## Documentation Truth Sources
- Limits and defaults:
  - `src/server/shelby.ts`
- API transport behavior:
  - `src/server/apiV1.ts`
  - `src/services/FileEncryptionService.ts`
  - `native/apple/Sources/CoreNetworking/APIClient.swift`
  - `native/android/core/network/src/main/kotlin/com/securepastebin/core/network/ApiClient.kt`
- Branding:
  - web metadata/routes + native app metadata already updated to SecuPaste

## Planned Content Updates
- Root README:
  - Replace scaffold text with real architecture, commands, and limits.
  - Document shared backend and multipart upload behavior.
  - Document key-fragment compatibility (`k2` default, `k1`/legacy decode).
- User docs and LLM docs:
  - Update retention language to configurable default (30 days unless overridden).
  - Keep security model and cryptographic details aligned with code.
- Native READMEs:
  - Update branding wording to SecuPaste.
  - Explicitly note multipart upload transport to `/api/v1/upload`.

## Non-Goals
- Reworking all historical design docs.
- Changing runtime behavior.
