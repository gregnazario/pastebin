# Keychain Password Providers - Design Document

## Overview

This document describes the architecture for securely storing passwords in platform-specific keychains with a pluggable provider system that supports iOS, Windows, Linux (Fedora, etc.), macOS, and web browsers.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                        │
│                    (Upload Page, View Page)                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      useKeychain Hook                           │
│            (React hook for keychain operations)                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      KeychainService                            │
│   (Singleton service with provider detection & selection)       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   KeychainProvider Interface                    │
│     save() | retrieve() | delete() | list() | isAvailable()    │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Web Credential│     │ Secure Storage  │     │  Native Bridge  │
│    Provider   │     │    Provider     │     │    Provider     │
│  (Browser API)│     │ (IndexedDB+AES) │     │ (iOS/Win/Linux) │
└───────────────┘     └─────────────────┘     └─────────────────┘
```

## Provider Interface

```typescript
interface KeychainProvider {
  readonly name: string;
  readonly type: KeychainProviderType;
  
  isAvailable(): Promise<boolean>;
  save(entry: KeychainEntry): Promise<void>;
  retrieve(id: string): Promise<KeychainEntry | null>;
  delete(id: string): Promise<boolean>;
  list(): Promise<KeychainEntryMetadata[]>;
}
```

## Provider Types

### 1. WebCredentialProvider

Uses the browser's Credential Management API for storing passwords.

**Platforms**: Modern browsers (Chrome, Firefox, Edge, Safari)

**Pros**:
- Native browser integration
- User-familiar password save prompts
- Syncs with browser password manager

**Cons**:
- Requires HTTPS
- Limited metadata storage
- Not available in all contexts

### 2. SecureStorageProvider

Fallback provider using IndexedDB with AES-GCM encryption.

**Platforms**: All browsers with IndexedDB support

**Features**:
- Derives storage key from device fingerprint + user master password
- Encrypts all stored data with AES-256-GCM
- Works offline

### 3. iOSKeychainProvider (Native Bridge)

For iOS apps using Capacitor, React Native, or similar frameworks.

**Platform**: iOS

**Integration Points**:
- Capacitor: @capacitor-community/secure-storage-plugin
- React Native: react-native-keychain
- Native Swift: Security.framework

### 4. WindowsCredentialProvider (Native Bridge)

For Windows apps using Electron, Tauri, or .NET MAUI.

**Platform**: Windows

**Integration Points**:
- Electron: keytar
- Tauri: tauri-plugin-store (encrypted)
- .NET: Windows.Security.Credentials

### 5. LinuxSecretProvider (Native Bridge)

For Linux apps using libsecret/GNOME Keyring/KWallet.

**Platform**: Linux (Fedora, Ubuntu, etc.)

**Integration Points**:
- Electron: keytar (uses libsecret)
- Direct: D-Bus Secret Service API
- CLI: secret-tool

### 6. macOSKeychainProvider (Native Bridge)

For macOS apps using Keychain Services.

**Platform**: macOS

**Integration Points**:
- Electron: keytar
- Tauri: tauri-plugin-store
- Native Swift: Security.framework

## Data Model

```typescript
interface KeychainEntry {
  id: string;              // Unique identifier (paste ID)
  password: string;        // The encrypted paste password
  metadata: {
    label: string;         // User-friendly name
    url?: string;          // Associated URL
    createdAt: number;     // Timestamp
    expiresAt?: number;    // Expiration timestamp
    notes?: string;        // User notes
  };
}

interface KeychainEntryMetadata {
  id: string;
  label: string;
  createdAt: number;
  expiresAt?: number;
}
```

## Provider Selection Strategy

1. Check for native bridge availability (iOS/Android/Desktop)
2. Check for Web Credential API support
3. Fall back to SecureStorageProvider

```typescript
async function selectProvider(): Promise<KeychainProvider> {
  // Priority order
  const providers = [
    new NativeBridgeProvider(),      // Native app context
    new WebCredentialProvider(),     // Browser with Credential API
    new SecureStorageProvider(),     // Encrypted IndexedDB fallback
  ];
  
  for (const provider of providers) {
    if (await provider.isAvailable()) {
      return provider;
    }
  }
  
  throw new Error('No keychain provider available');
}
```

## Security Considerations

1. **Encryption at Rest**: All passwords stored with AES-256-GCM
2. **Key Derivation**: Storage keys derived using Argon2id
3. **No Plaintext**: Passwords never stored in plaintext
4. **Expiration**: Auto-cleanup of expired entries
5. **Secure Memory**: Clear sensitive data after use

## Extensibility

New providers can be added by:

1. Implementing the `KeychainProvider` interface
2. Registering with `KeychainService.registerProvider()`
3. Adding availability detection logic

```typescript
// Example: Adding a new provider
const customProvider = new CustomKeychainProvider();
KeychainService.registerProvider(customProvider);
```

## User Experience

### Save Flow
1. User uploads a file with password
2. After successful upload, prompt: "Save password to keychain?"
3. If yes, save with paste ID as key
4. Show confirmation with option to manage saved passwords

### Retrieve Flow
1. User opens paste link
2. Check keychain for matching paste ID
3. If found, offer to auto-fill password
4. User confirms, password is filled

## Implementation Phases

1. **Phase 1**: Core interfaces and types
2. **Phase 2**: WebCredentialProvider + SecureStorageProvider
3. **Phase 3**: Native provider stubs with documentation
4. **Phase 4**: React hooks and UI integration
5. **Phase 5**: Tests and documentation

---

*Last updated: 2026-02-01*
