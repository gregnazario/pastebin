# Native Clients

This directory contains fully native client implementations for Secure Pastebin.

## Platforms
- `apple/`: Swift implementation for iOS and iPadOS first, then macOS.
- `android/`: Kotlin implementation for Android.

## Scope
These clients target the signed-off roadmap and architecture in:
- `design-docs/native-swift-kotlin-architecture.md`
- `plans/native-swift-kotlin-roadmap.md`

## Current Development Notes
- Upload/decrypt feature orchestration is implemented on both Apple and Android modules.
- A development-only crypto engine is currently used for native UI flow wiring.
- Do not ship with the development crypto engine; replace with production parity crypto implementation before release.
