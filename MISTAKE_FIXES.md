# Mistake Fixes

This document tracks implementation mistakes discovered during development and their fixes.

---

## [2026-02-07] Native Crypto Adapter Build/Logic Issues

### Issue 1: Swift Argon2 Dependency Linked `genkat.c` (`_main`) Into Test Binary
- **Context**: Enabling the upstream `Argon2` package introduced a duplicate `_main` symbol while linking `swift test`.
- **Root Cause**: The upstream C target includes `genkat.c`, which defines a standalone executable `main`.
- **Fix**:
  - Removed direct dependency on upstream `CArgon2` product.
  - Vendored a minimal Argon2 C subset under `native/apple/Vendor/Argon2`.
  - Excluded `genkat.c` and added a vendor README documenting the reason.
- **Result**: `swift test` now links and passes.

### Issue 2: Kotlin `readUInt32()` Returned `Unit` Due Newline After `return`
- **Context**: `ProductionNativeCryptoEngine.kt` payload parser had a malformed `readUInt32()` implementation.
- **Root Cause**: A line break immediately after `return` triggered Kotlin semicolon insertion, returning `Unit`.
- **Fix**: Rewrote the expression so `return` and expression are on the same statement.
- **Result**: Core crypto Kotlin sources compile correctly under direct `kotlinc` checks.
