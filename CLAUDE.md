# Project Development Rules

This file contains the development rules and guidelines for this project.

## Core Development Rules

1. **Commit frequently** - Commit after every section with descriptive messages
2. **Documentation required** - Every file must include documentation
3. **Unit testing** - Write unit tests when possible
4. **E2E testing scope** - E2E testing against localnet only (never devnet/testnet/mainnet)
5. **Conversation tracking** - Track user prompts and commands used in `CONVO.md`
6. **State tracking** - Track current state in `SCRATCHPAD.md` for conversation handoffs
7. **Plans location** - Implementation plans go in `plans/`
8. **Design docs location** - Design documentation goes in `design-docs/`
9. **Plan before implementing** - Create plan + detailed design docs with diagrams before implementing features
10. **Mistake tracking** - Track mistakes and fixes in `MISTAKE_FIXES.md`
11. **Security tracking** - Track security issues and fixes in `SECURITY_FIXES.md`
12. **User interviews** - Interview user for non-obvious choices/tradeoffs (summarize tradeoffs first)

## Project Structure

```
/
├── CLAUDE.md           # This file - project rules
├── CONVO.md           # Conversation and prompt tracking
├── SCRATCHPAD.md      # Current state tracking
├── MISTAKE_FIXES.md   # Mistake and fix tracking
├── SECURITY_FIXES.md  # Security issue tracking
├── plans/             # Implementation plans
├── design-docs/       # Design documentation with diagrams
└── [project files]    # Actual project implementation
```

## Best Practices

### Documentation
- Every file should have a clear purpose documented at the top
- Functions should have docstrings explaining their purpose
- Complex logic should include inline comments

### Testing
- Unit tests should cover individual functions/methods
- Integration tests should cover component interactions
- E2E tests should validate user workflows (localnet only)

### Security
- Never commit secrets or API keys
- Always validate user inputs
- Follow principle of least privilege
- Track all security issues in SECURITY_FIXES.md

### Planning
- Before implementing any feature:
  1. Create a plan in `plans/`
  2. Create design documentation in `design-docs/`
  3. Include diagrams where helpful
  4. Interview user for non-obvious tradeoffs

### Git Workflow
- Commit after completing each logical section
- Use descriptive commit messages
- Include what changed and why

## Commands to Run

**Always use `bun` instead of `npm` for all package management and script execution.**

When code changes are made, run these commands (when available):
- Linting: `bun run lint`
- Type checking: `bun run typecheck`
- Tests: `bun test`
- Build: `bun run build`
- Dev server: `bun run dev`

## Critical Build Configuration

### Encrypted Blob Storage

The server stores client-encrypted ciphertext only. Do not add server-side
decryption. Adapters live in `src/server/storage.ts`:

- `memory` — unit tests / ephemeral use (`BLOB_STORE=memory`)
- `filesystem` — local default (`.data/blobs`, or `/tmp/secupaste-blobs` on Vercel)
- `s3` — Cloudflare R2 or any S3-compatible store (recommended free production backend)

The former Shelby `copyClayWasmPlugin()` was removed with `@shelby-protocol/sdk`.
Do not re-add it unless that backend is restored.

Production (Cloudflare R2 example):

```
BLOB_STORE=s3
S3_BUCKET=secupaste
S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

*Last updated: 2026-08-22*