# Native Premium Minimal Design System Plan

This plan introduces a premium minimal visual system for the native Apple and Android apps while preserving existing feature behavior and test contracts.

## Goals
- Create shared visual tokens per platform (color, spacing, radius, typography intent).
- Introduce reusable UI wrappers/components for cards, surfaces, and primary actions.
- Apply the system to Upload, Decrypt, History, and runtime settings screens.
- Preserve existing copy, behavior, and instrumentation test tags.

## Scope
- Apple Swift native shell and feature screens.
- Android Kotlin Compose app shell and feature screens.
- Documentation updates for where design tokens/components live.

## Constraints
- Do not change product logic, APIs, or security behavior.
- Keep accessibility semantics and control labels stable.
- Keep existing Android instrumentation selectors intact.

## Steps
1. Add design documentation:
   - `design-docs/native-premium-minimal-design-system.md`
2. Implement Apple design system:
   - add shared theme tokens/modifiers in `native/apple/Sources/AppShellDemo/`
   - apply across host shell and flow views.
3. Implement Android design system:
   - add shared Compose theme + premium surface components in `native/android/app/src/main/java/com/securepastebin/app/`
   - apply across app shell and flow screens.
4. Update native READMEs with design-system usage paths.
5. Validate:
   - `swift test`
   - `gradle :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:assembleDebugAndroidTest`
   - `bun run lint && bun run typecheck && bun test && bun run build`

## Acceptance Criteria
- Both native shells present a coherent premium minimal style language.
- Core screens share consistent card/surface treatment, spacing, and action hierarchy.
- Existing tests continue passing without selector regressions.
