/**
 * Keychain Providers Index
 *
 * This module exports all available keychain providers.
 * Each provider implements the KeychainProvider interface and
 * handles secure password storage for a specific platform.
 */

// Browser-based providers
export { WebCredentialProvider } from './WebCredentialProvider'
export { SecureStorageProvider } from './SecureStorageProvider'

// Native bridge providers
export {
  NativeBridgeProvider,
  iOSKeychainProvider,
  macOSKeychainProvider,
  WindowsCredentialProvider,
  LinuxSecretProvider,
  AndroidKeystoreProvider,
} from './NativeBridgeProvider'

// Re-export bridge interface for custom implementations
export type { NativeBridge } from './NativeBridgeProvider'
