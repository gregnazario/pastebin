# SecuPaste Brand Rename Plan

## Objective
Rename the app brand shown to users from "Secure Pastebin" to "SecuPaste" across web, iOS/iPadOS/macOS app shell metadata, and Android app metadata.

## Scope
- Web branding text in title, metadata, landing/docs copy, onboarding, and PWA manifest.
- iOS app display name via Info.plist.
- Android launcher label via AndroidManifest.

## Out Of Scope
- Package/module identifiers (`com.securepastebin`, Swift package names, file IDs).
- Cryptographic protocol strings and storage IDs.

## Steps
1. Update web UI and SEO metadata strings to "SecuPaste".
2. Update PWA manifest branding fields (`name`, `short_name`, screenshot label).
3. Update iOS display name metadata.
4. Update Android launcher app label metadata.
5. Run lint/typecheck/build plus native platform validation.
