# Apple Native App (Swift)

This workspace contains the Swift foundations for Secure Pastebin on Apple platforms.

## Targets
- iOS + iPadOS (v1)
- macOS (post-GA follow-on)

## Modules
- `CoreCrypto`
- `CoreNetworking`
- `CoreStorage`
- `FeatureUpload`
- `FeatureView`
- `FeatureHistory`

## UI Flow Wiring
- SwiftUI upload and decrypt flow views are implemented in:
  - `Sources/FeatureUpload/UploadFlowView.swift`
  - `Sources/FeatureView/DecryptFlowView.swift`

## Security Note
- `DevelopmentNativeCryptoEngine` is for flow wiring only and is non-production.
