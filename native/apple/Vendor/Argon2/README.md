# Vendored Argon2 C Sources

This directory vendors the minimum Argon2 reference C sources required by `CoreCrypto` for Argon2id raw key derivation with web-compatible parameters.

## Source
- Upstream: `https://github.com/calebkleveter/Argon2` (which wraps `phc-winner-argon2`)
- Imported subset:
  - `include/argon2.h`
  - `src/argon2.c`
  - `src/core.c`
  - `src/encoding.c`
  - `src/ref.c`
  - `src/thread.c`
  - `src/core.h`
  - `src/encoding.h`
  - `src/thread.h`
  - `src/blake2/blake2.h`
  - `src/blake2/blake2-impl.h`
  - `src/blake2/blake2b.c`

## Note
- `src/genkat.c` is intentionally excluded because it defines a standalone `main` symbol and would conflict with Swift test runner linking.
