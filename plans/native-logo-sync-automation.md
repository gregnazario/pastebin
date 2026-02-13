# Native Logo Sync Automation Plan

This plan ensures the Pastebin logo is always copied from web assets into Android and Apple native app resources.

## Goal
- Eliminate manual logo copy drift between web and native clients.

## Scope
- Source of truth: `public/logo192.png`.
- Targets:
  - `native/android/app/src/main/res/drawable/pastebin_logo.png`
  - `native/apple/AppShellDemoApp/Sources/Resources/pastebin-logo.png`

## Steps
1. Add script `scripts/sync-native-logo.ts` to copy source logo to both native targets.
2. Add root command `bun run sync:logo:native` in `package.json`.
3. Add Android Gradle pre-build dependency to sync logo before builds.
4. Add Apple Xcode pre-build script (via `project.yml` + regenerated project) to sync logo before builds.
5. Update native READMEs with sync behavior.
6. Validate:
   - `bun run sync:logo:native`
   - `bun run lint`
   - `bun run typecheck`
   - `bun test`
   - `gradle :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:assembleDebugAndroidTest`
   - `xcodebuild -project native/apple/SecurePastebinAppleDemo.xcodeproj -scheme SecurePastebinDemoApp -configuration Debug -destination 'generic/platform=iOS Simulator' build`

## Acceptance Criteria
- Running native builds refreshes logo files automatically from `public/logo192.png`.
- Manual logo-copy step is no longer required.
- Existing native app logo rendering remains functional.
