# Web Upload Buffer Runtime Fix Design

This design removes a Node-only global dependency from the upload commitment path and separates SDK targets so browser-reachable code does not rely on node-only SDK exports.

## Problem
- Upload flow currently calls:
  - `generateCommitments(provider, Buffer.from(data))`
- In non-Node runtimes (for example edge-style server runtimes), `Buffer` may be undefined, causing upload failure with `Buffer is not defined`.

## Design Decision
- Use `Uint8Array` directly:
  - `generateCommitments(provider, data)`
- Rationale:
  - Shelby SDK type contract accepts `Uint8Array | ReadableStream<Uint8Array>`.
  - `data` is already a `Uint8Array` (`new Uint8Array(input.data)`), so conversion is unnecessary.
  - This removes runtime coupling to Node globals while preserving behavior.

## SDK Target Separation
- Browser-reachable imports in `src/server/shelby.ts` use:
  - `@shelby-protocol/sdk/browser`
- Backend-only Shelby client construction (`ShelbyNodeClient`) is loaded from:
  - `@shelby-protocol/sdk/node`
- The node SDK import is performed only in server runtime code (`import.meta.env.SSR` guarded path).

## Flow
```mermaid
flowchart LR
  A["Upload request bytes (number[])"] --> B["Uint8Array conversion"]
  B --> C["Browser SDK commitment helpers"]
  C --> D["Server-only Node SDK client path"]
  D --> E["Register blob + upload to Shelby RPC"]
```

## Risks And Mitigations
- Risk: SDK function behavior differs between `Buffer` and `Uint8Array`.
  - Mitigation: unit test validates `Uint8Array` input path and existing integration flow remains unchanged.
- Risk: hidden `Buffer` assumptions elsewhere in upload path.
  - Mitigation: regression test plus full test/typecheck/build validation.

## Validation
- Unit test verifies `generateCommitments` receives `Uint8Array`.
- Existing test suite, typecheck, and production build must pass.
