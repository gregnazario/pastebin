# SecuPaste Brand Rename Design

## Summary
Apply a user-facing brand rename to "SecuPaste" without changing internal identifiers that could break compatibility.

## Design Decisions
- Rename only display/brand strings users see.
- Keep bundle/package/module identifiers unchanged to avoid migration risk.
- Keep backend domain and file-ID formats unchanged.

## Touchpoints
- Web:
  - `src/routes/__root.tsx`
  - `src/routes/index.tsx`
  - `src/routes/docs.tsx`
  - `src/components/Onboarding.tsx`
  - `src/components/PWAPrompt.tsx`
  - `public/manifest.json`
  - `public/og-image.svg`
  - `public/llms.txt`
  - `public/llms-full.txt`
- Apple:
  - `native/apple/AppShellDemoApp/Support/Info.plist` (`CFBundleDisplayName`)
- Android:
  - `native/android/app/src/main/AndroidManifest.xml` (`android:label`)

## Non-Breaking Guarantees
- No API contract changes.
- No package/bundle/application ID changes.
- No crypto/storage format changes.

## Rollout
Branding updates ship as a normal app/web release with no migration steps required.
