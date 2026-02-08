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
- History flow components are available in `FeatureHistory`:
  - filtered list of recent entries
  - expired-entry toggle
  - delete action for entries
  - open/share actions for generated history links
  - optional in-app open callback for routing to decrypt screens
- `AppShellDemo` module provides a sample SwiftUI host shell:
  - Upload / Decrypt / History tab composition
  - in-app History `Open` -> Decrypt prefill handoff
  - source: `Sources/AppShellDemo/AppHostFlowView.swift`

## Xcode Demo App Scaffold
- A runnable iOS demo app scaffold is included:
  - Project spec: `project.yml`
  - App sources: `AppShellDemoApp/Sources/`
  - App project: `SecurePastebinAppleDemo.xcodeproj`
- The app launches `DemoAppFactory.makeRootView()` which wires `AppHostFlowView` with local API defaults.
- To regenerate project files after target/spec edits:
  - `xcodegen generate --spec project.yml`

## Security Note
- `ProductionNativeCryptoEngine` is the default engine for app integrations.
- `DevelopmentNativeCryptoEngine` remains available for isolated wiring tests only and is non-production.
