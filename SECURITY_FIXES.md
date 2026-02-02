# Security Fixes

This document tracks security issues and their fixes for the pastebin project.

---

## [2026-02-02] Encrypted Filename Exposure in URL

### Issue
When a user uploaded a file with the "Encrypt filename and metadata" option enabled, the filename was still exposed in the generated shareable URL.

### Root Cause
The blob name used for storage was constructed as:
```
pastebin-{timestamp}-{sanitizedFilename}-{randomSuffix}
```

This meant that even though the filename was encrypted in the payload, it was also embedded in the URL path, defeating the purpose of the metadata encryption feature.

### Impact
- **Severity**: Medium
- **Privacy Impact**: Users who expected their filenames to be hidden could have their filenames exposed to anyone with access to the URL.
- **Affected Feature**: "Encrypt filename and metadata" checkbox on upload page

### Fix
Modified `FileEncryptionService.ts` to use a generic placeholder filename (`"encrypted"`) when the `encryptMetadata` option is enabled. The blob name now becomes:
```
pastebin-{timestamp}-encrypted-{randomSuffix}
```

The actual filename is still stored encrypted within the payload and is properly revealed only after decryption with the correct password.

### Files Changed
- `src/services/FileEncryptionService.ts`

### Testing
- Upload a file with "Encrypt filename and metadata" enabled
- Verify the generated URL contains `encrypted` instead of the actual filename
- Verify the file still downloads with the correct filename after decryption
