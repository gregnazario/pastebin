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
- Upload flow now supports both:
  - note input mode
  - native file picker mode via `fileImporter`
- Decrypt flow supports MIME-aware preview for:
  - text
  - image
  - PDF
  - audio/video media
- Decrypt flow now includes post-decrypt actions:
  - Save As (native file export dialog)
  - Export (native share sheet)
- Decrypt success now persists local history metadata through `UserDefaultsHistoryStore`.

## Security Note
- `ProductionNativeCryptoEngine` is the default engine for app integrations.
- `DevelopmentNativeCryptoEngine` remains available for isolated wiring tests only and is non-production.
