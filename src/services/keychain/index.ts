/**
 * Keychain Password Providers
 *
 * This module provides a pluggable system for storing passwords in
 * platform-specific keychains (iOS Keychain, Windows Credential Manager,
 * Linux Secret Service, etc.) with fallback to encrypted local storage.
 *
 * Usage:
 * ```typescript
 * import { KeychainService, getKeychainService } from './services/keychain'
 *
 * // Get the singleton service
 * const keychain = getKeychainService()
 *
 * // Initialize (auto-detects best provider)
 * await keychain.initialize()
 *
 * // Save a password
 * await keychain.save({
 *   id: 'paste-123',
 *   password: 'my-secret-password',
 *   label: 'My Important Paste',
 *   createdAt: Date.now(),
 *   expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
 * })
 *
 * // Retrieve a password
 * const entry = await keychain.retrieve('paste-123')
 * if (entry) {
 *   console.log('Password:', entry.password)
 * }
 * ```
 *
 * Custom Provider Registration:
 * ```typescript
 * import { KeychainService, KeychainProvider } from './services/keychain'
 *
 * class MyCustomProvider implements KeychainProvider {
 *   // ... implementation
 * }
 *
 * const keychain = KeychainService.getInstance()
 * keychain.registerProvider(new MyCustomProvider(), 50) // priority 50
 * ```
 */

// Main service
export { KeychainService, getKeychainService } from './KeychainService'

// Types
export type {
  KeychainProvider,
  KeychainProviderCapabilities,
  KeychainEntry,
  KeychainEntryMetadata,
  KeychainOperationResult,
  KeychainSaveOptions,
  KeychainRetrieveOptions,
  KeychainServiceConfig,
  KeychainEvent,
  KeychainEventListener,
} from './types'

export { KeychainProviderType, KeychainEventType } from './types'

// Providers (for advanced usage / custom integrations)
export {
  WebCredentialProvider,
  SecureStorageProvider,
  NativeBridgeProvider,
  iOSKeychainProvider,
  macOSKeychainProvider,
  WindowsCredentialProvider,
  LinuxSecretProvider,
  AndroidKeystoreProvider,
} from './providers'

// Native bridge type for custom implementations
export type { NativeBridge } from './providers'
