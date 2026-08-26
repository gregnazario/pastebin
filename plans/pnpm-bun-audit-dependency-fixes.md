# pnpm / bun Audit Dependency Fixes

> **For agentic workers:** Implement the patched dependency set in `package.json`, refresh `bun.lock` and `package-lock.json`, then verify with `bun audit`, `pnpm audit` / `npm audit`, lint, typecheck, tests, and build.

**Goal:** Clear current pnpm/bun/npm audit findings for the web app without jumping to unrelated major upgrades (Vite 8, Vitest 5, js-yaml 5, Babel 8).

**Architecture:** Bump direct packages that have patched releases, refresh `nitro-nightly` (already aliased as `nitro`), and add npm/bun/pnpm overrides so remaining transitive advisories resolve to patched versions.

**Tech Stack:** Bun (primary install/CI), npm lockfile kept in sync for `npm`/`pnpm audit`, Vite 7.3.6, Vitest 4.1.x, TanStack Start 1.168.x, Nitro nightly.

## Global Constraints

- Keep Vite on the patched 7.x line (`>=7.3.6`), not Vite 8.
- Keep Vitest on patched 4.1.x, not 5.x RC.
- Keep js-yaml on patched 4.3.1, nanoid on patched 3.3.18, undici on patched 7.29.0, Babel on patched 7.29.7.
- Pin `nitro` to `npm:nitro-nightly@3.0.1-20260826-135133-65a4e394` (patched `h3`/`srvx`). Do not keep the January 2026 lockfile pin.
- Preserve existing web/server APIs (`createServerFn`, `/api/v1/*`, security headers in `src/server.ts`).
- Use `bun` for install, lint, typecheck, test, and build.

## File Map

- `package.json` — direct version floors, `overrides`, `pnpm.overrides`, `audit` script
- `bun.lock` — Bun lockfile (CI source of truth)
- `package-lock.json` — npm lockfile used by npm/pnpm audit
- `.github/workflows/ci.yml` — add audit gate
- `SECURITY_FIXES.md` — record advisories and patched versions

## Tasks

- [x] Document the audit findings and patched-version policy
- [x] Bump direct deps and add overrides
- [x] Refresh lockfiles
- [x] Verify audits are clean (`bun`/`npm`/`pnpm` audit: 0)
- [x] Run lint, typecheck, tests, and build
- [x] Fix TanStack Start 1.168 handler result wrapping and `validator()` deprecation
