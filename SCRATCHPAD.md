# Scratchpad - Current State Tracking

This file maintains the current state of the project for smooth conversation handoffs.

## Current State (2026-02-01)

### Project Status
- **Phase**: Phase 5 - Testing & Benchmarking (Advanced)
- **Current Task**: Performance benchmarks and file type testing
- **Next Steps**: Browser compatibility testing, final deployment

### Completed Phases
1. ✅ **Phase 1**: React TypeScript setup with routing
2. ✅ **Phase 2**: Shelby.xyz storage integration
3. ✅ **Phase 3**: Cryptography implementation (Kyber + AES-GCM)
4. ✅ **Phase 4**: Upload/download UI with encryption

### Active Work
- ✅ Created FileEncryptionService to orchestrate workflows
- ✅ Updated UploadPage with password validation and progress
- ✅ Updated ViewPage with decryption and download
- ✅ Added progress indicators and error handling
- ✅ Implemented secure link generation with key in fragment
- ✅ Added clipboard functionality

### Key Technical Decisions
1. **Hybrid Encryption**: Kyber768 + AES-256-GCM for post-quantum security
2. **Key Management**: Private key in URL fragment (never sent to server)
3. **Password Validation**: Entropy-based with visual feedback
4. **Progress Tracking**: Multi-stage progress for user feedback
5. **Security**: Memory clearing, password hiding, automatic cleanup

### Architecture Overview
```
Frontend (React) → Encryption Layer → Storage (Shelby)
    ↓                    ↓                    ↓
  UI/UX            Kyber + AES          Decentralized
                   Argon2 KDF              Storage
```

### Features Implemented
- 📤 **Upload**: File selection, password validation, encryption, progress
- 📝 **Note Input**: Direct text/note editing with mode selector toggle
- 🔐 **Encryption**: Post-quantum Kyber + AES-GCM hybrid
- 🔗 **Links**: Shareable URLs with private key in fragment
- 📥 **Download**: Password entry, decryption, automatic download
- 🎨 **UI**: Progress bars, error handling, success states
- 📋 **Clipboard**: One-click link copying
- 📜 **History**: Browser-based paste history with generic persistence layer

### Environment
- Working Directory: `/Users/greg/git/pastebin`
- Platform: macOS (Darwin 25.2.0)
- Git Status: Phases 1-3 committed, Phase 4 ready
- Dev Server: `bun dev`
- Tests: `bun test`
- Build: `bun run build`

### Known Issues
- Argon2 WASM loading in tests (mocked)
- Some crypto tests need runtime environment
- Shelby API endpoints need verification

### Phase 5 Progress
- ✅ Created comprehensive E2E test suite with Playwright
- ✅ Added test scripts and configuration
- ✅ Created testing strategy documentation
- ⚠️ Unit tests blocked by crypto library compatibility issues
- 📝 Documented testing challenges and solutions

### Phase 6: LLM-Friendliness & Full Accessibility (2026-02-06)
- ✅ Created `llms.txt` and `llms-full.txt` for AI crawler discoverability
- ✅ Created `sitemap.xml` (was referenced in robots.txt but missing)
- ✅ Updated `robots.txt` with LLM documentation references
- ✅ Added JSON-LD structured data (WebApplication, WebSite, FAQPage schemas)
- ✅ Added canonical URL link
- ✅ Added skip navigation link for keyboard/screen reader users
- ✅ Added visible `:focus-visible` styles for all interactive elements
- ✅ Added `.sr-only` utility class for screen-reader-only content
- ✅ Fixed heading hierarchy (h1 → h2 on home page features)
- ✅ Converted upload form to proper `<form>` with `onSubmit`
- ✅ Added `aria-describedby` for error associations on all form fields
- ✅ Added `aria-invalid` states on password fields
- ✅ Added `role="progressbar"` with aria-valuenow/min/max on progress bars
- ✅ Used `<output>` element for progress containers (semantic status)
- ✅ Added `aria-busy` on submit buttons during upload/decrypt
- ✅ Added `role="alert"` on error messages for screen reader announcements
- ✅ Converted decrypt form to proper `<form>` with `onSubmit`
- ✅ Used `<dl>` for file details instead of `<p>` for semantic structure
- ✅ Added `aria-expanded` and `aria-controls` on preview toggle
- ✅ Improved collapsible sections with `aria-controls` and `aria-labelledby`
- ✅ Made specs tables accessible with `<th scope="row">` and visually-hidden `<thead>`
- ✅ Added `aria-label` on all `<nav>` elements (Main, Mobile, Footer)
- ✅ Added `aria-controls` on mobile hamburger button
- ✅ Added `aria-hidden` on mobile nav overlay, proper focus management
- ✅ Improved onboarding modal with focus trap, focus restore, and `aria-describedby`
- ✅ Used `<fieldset>` for mode selector with visually-hidden `<legend>`
- ✅ Used semantic `<ul>/<li>` for feature cards on home page
- ✅ Added high-contrast mode support (already existed)
- ✅ Added prefers-reduced-motion support (already existed)
- ✅ All lint checks pass, all type checks pass, build succeeds

### Next Steps
- Browser compatibility testing
- Performance optimization
- Security audit
- Deployment configuration

### Commands
```bash
# Development
bun dev          # Start dev server
bun test         # Run tests
bun run build    # Production build
bun run lint     # Check code style
bun run typecheck # Type checking
```

---

*Last updated: 2026-02-06*