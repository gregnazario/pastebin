# Apple Demo Environment Presets Plan

This plan adds preset environment selection for the Apple demo app settings.

## Goal
- Allow one-tap selection of `Local`, `Staging`, and `Production` environments in demo settings.

## Scope
- Update `DemoSettingsView` to expose preset options and apply selected preset URL.
- Preserve existing manual base URL editing and validation behavior.
- Keep current `DemoRootContainerView` apply/rebuild behavior unchanged.

## Preset Values
- Local: `http://127.0.0.1:3000`
- Staging: `https://staging.pastebin.sed.fyi`
- Production: `https://pastebin.sed.fyi`

## Steps
1. Add environment preset model in `DemoSettingsView`.
2. Add preset selection UI and “Use Selected Preset” action.
3. Keep manual URL field as override path.
4. Update Apple README docs.
5. Validate with `swift test`, `xcodebuild` demo app build, and standard repo checks.
