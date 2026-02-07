# Android Native App (Kotlin)

This workspace contains the Kotlin + Android foundations for Secure Pastebin.

## Architecture
- Jetpack Compose UI layer
- Modularized `core` and `feature` modules
- API v1 integration against `/api/v1/*`

## Modules
- `:app`
- `:core:crypto`, `:core:network`, `:core:storage`
- `:feature:upload`, `:feature:view`, `:feature:history`
