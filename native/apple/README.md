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
  - iCloud sync action with conflict-aware sync summary state
- `CoreStorage` now includes cloud sync primitives:
  - `ICloudHistorySyncAdapter` (`NSUbiquitousKeyValueStore`)
  - `HistoryCloudSyncCoordinator` (merge + conflict tracking)
- `AppShellDemo` module provides a sample SwiftUI host shell:
  - Upload / Decrypt / History tab composition
  - in-app History `Open` -> Decrypt prefill handoff
  - source: `Sources/AppShellDemo/AppHostFlowView.swift`
- Interaction-level SwiftUI view-model coverage is implemented in tests:
  - `Tests/FeatureUploadTests/FeatureUploadTests.swift`
  - `Tests/FeatureViewTests/FeatureViewTests.swift`
- Host-shell integration coverage is implemented in:
  - `Tests/AppShellDemoTests/AppShellDemoTests.swift`
  - includes history handoff persistence and runtime settings sheet/apply/cancel flow state.
  - `Tests/FeatureViewTests/FeatureViewTests.swift` includes decrypt success action coverage for `Save As`/`Export` readiness.

## Xcode Demo App Scaffold
- A runnable iOS demo app scaffold is included:
  - Project spec: `project.yml`
  - App sources: `AppShellDemoApp/Sources/`
  - App project: `SecurePastebinAppleDemo.xcodeproj`
- The app launches `DemoAppFactory.makeRootView()` which wires `AppHostFlowView` with local API defaults.
- The demo app includes a runtime settings sheet (gear button) to update API base URL without rebuilding.
- Demo settings include environment presets:
  - `Local` (`http://127.0.0.1:3000`)
  - `Staging` (`https://staging.pastebin.sed.fyi`)
  - `Production` (`https://pastebin.sed.fyi`)
- To regenerate project files after target/spec edits:
  - `xcodegen generate --spec project.yml`

## Premium Minimal Design System
- Shared Apple shell design tokens and modifiers:
  - `Sources/AppShellDemo/PremiumMinimalDesignSystem.swift`
- Applied in host shell:
  - `Sources/AppShellDemo/AppHostFlowView.swift`
  - `AppShellDemoApp/Sources/DemoRootContainerView.swift`
  - `AppShellDemoApp/Sources/DemoSettingsView.swift`
- Core flow action styling updates:
  - `Sources/FeatureUpload/UploadFlowView.swift`
  - `Sources/FeatureView/DecryptFlowView.swift`
  - `Sources/FeatureHistory/HistoryFeature.swift`

## Security Note
- `ProductionNativeCryptoEngine` is the default engine for app integrations.
- `DevelopmentNativeCryptoEngine` remains available for isolated wiring tests only and is non-production.

## Phase 4 Hardening Baseline
- Hardening checklist and profiling protocol:
  - `design-docs/native-phase4-hardening-baseline.md`
- Latest execution report:
  - `design-docs/native-phase4-hardening-report-2026-02-09.md`
- Physical-device sign-off runbook and evidence templates:
  - `native/qa/phase4/README.md`

## Phase 5 Store Readiness
- Apple packaging templates and checklist:
  - `native/release/apple/release-checklist.md`
  - `native/release/apple/app-store-connect-metadata.md`
  - `native/release/apple/privacy-nutrition-label-template.md`
- Unified release gate:
  - `native/release/release-gate-checklist.md`
- Latest Phase 4/5 execution report:
  - `design-docs/native-phase4-phase5-execution-report-2026-02-09.md`
