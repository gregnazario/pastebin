/**
 * NativeBridgeProvider
 *
 * Abstract base class for native keychain providers. This provides a common
 * interface for integrating with platform-specific keychain services when
 * the application is packaged as a native app (Electron, Capacitor, Tauri, etc.)
 *
 * Concrete implementations:
 * - iOSKeychainProvider: iOS Keychain Services
 * - macOSKeychainProvider: macOS Keychain Services
 * - WindowsCredentialProvider: Windows Credential Manager
 * - LinuxSecretProvider: libsecret/GNOME Keyring/KWallet
 * - AndroidKeystoreProvider: Android Keystore
 */

import type {
  KeychainEntry,
  KeychainEntryMetadata,
  KeychainOperationResult,
  KeychainProvider,
  KeychainProviderCapabilities,
  KeychainRetrieveOptions,
  KeychainSaveOptions,
} from '../types'
import { KeychainProviderType } from '../types'

/**
 * Native bridge interface that native implementations must provide
 * This is injected by the native app shell (Capacitor, Electron, etc.)
 */
export interface NativeBridge {
  /** Identifier for the platform */
  platform: string
  /** Save a credential */
  saveCredential(
    service: string,
    account: string,
    password: string,
    metadata?: Record<string, string>,
  ): Promise<boolean>
  /** Retrieve a credential */
  getCredential(service: string, account: string): Promise<{ password: string; metadata?: Record<string, string> } | null>
  /** Delete a credential */
  deleteCredential(service: string, account: string): Promise<boolean>
  /** List all credentials for a service */
  listCredentials(service: string): Promise<Array<{ account: string; metadata?: Record<string, string> }>>
  /** Check if biometric authentication is available */
  isBiometricAvailable?(): Promise<boolean>
  /** Authenticate with biometrics */
  authenticateBiometric?(reason: string): Promise<boolean>
}

/**
 * Service identifier for storing credentials
 */
const SERVICE_NAME = 'com.pastebin.secure'

/**
 * Declare global window interface extension for native bridge
 */
declare global {
  interface Window {
    /** Capacitor native bridge */
    Capacitor?: {
      Plugins?: {
        SecureStorage?: NativeBridge
      }
      isNativePlatform?: () => boolean
      getPlatform?: () => string
    }
    /** Electron native bridge */
    electronBridge?: NativeBridge
    /** Tauri native bridge */
    __TAURI__?: {
      invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
    }
    /** Generic native bridge (for custom implementations) */
    nativeKeychain?: NativeBridge
  }
}

/**
 * Abstract base class for native keychain providers
 */
export abstract class NativeBridgeProvider implements KeychainProvider {
  abstract readonly name: string
  abstract readonly type: KeychainProviderType
  abstract readonly capabilities: KeychainProviderCapabilities

  protected bridge: NativeBridge | null = null

  /**
   * Get the native bridge instance
   */
  protected abstract getBridge(): NativeBridge | null

  async isAvailable(): Promise<boolean> {
    this.bridge = this.getBridge()
    return this.bridge !== null
  }

  async save(entry: KeychainEntry, _options?: KeychainSaveOptions): Promise<KeychainOperationResult> {
    if (!this.bridge) {
      return { success: false, error: 'Native bridge not available' }
    }

    try {
      const metadata = {
        label: entry.label,
        url: entry.url || '',
        createdAt: entry.createdAt.toString(),
        expiresAt: entry.expiresAt?.toString() || '',
        notes: entry.notes || '',
      }

      const success = await this.bridge.saveCredential(SERVICE_NAME, entry.id, entry.password, metadata)

      return { success }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save credential',
      }
    }
  }

  async retrieve(id: string, options?: KeychainRetrieveOptions): Promise<KeychainEntry | null> {
    if (!this.bridge) return null

    try {
      const result = await this.bridge.getCredential(SERVICE_NAME, id)
      if (!result) return null

      const metadata = result.metadata || {}

      return {
        id,
        password: result.password,
        label: metadata.label || id,
        url: metadata.url || undefined,
        createdAt: parseInt(metadata.createdAt || '0', 10) || Date.now(),
        expiresAt: metadata.expiresAt ? parseInt(metadata.expiresAt, 10) : undefined,
        notes: metadata.notes || undefined,
      }
    } catch (error) {
      if (options?.silent) return null
      throw error
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!this.bridge) return false

    try {
      return await this.bridge.deleteCredential(SERVICE_NAME, id)
    } catch {
      return false
    }
  }

  async list(): Promise<KeychainEntryMetadata[]> {
    if (!this.bridge) return []

    try {
      const credentials = await this.bridge.listCredentials(SERVICE_NAME)

      return credentials.map((cred) => ({
        id: cred.account,
        label: cred.metadata?.label || cred.account,
        url: cred.metadata?.url || undefined,
        createdAt: parseInt(cred.metadata?.createdAt || '0', 10) || Date.now(),
        expiresAt: cred.metadata?.expiresAt ? parseInt(cred.metadata.expiresAt, 10) : undefined,
      }))
    } catch {
      return []
    }
  }

  async clear(): Promise<number> {
    if (!this.bridge) return 0

    try {
      const entries = await this.list()
      let count = 0

      for (const entry of entries) {
        if (await this.delete(entry.id)) {
          count++
        }
      }

      return count
    } catch {
      return 0
    }
  }
}

/**
 * iOS Keychain Provider
 *
 * Uses iOS Keychain Services through Capacitor or React Native bridge.
 *
 * Integration:
 * - Capacitor: @capacitor-community/secure-storage-plugin
 * - React Native: react-native-keychain
 *
 * Features:
 * - Secure Enclave support on supported devices
 * - Touch ID / Face ID authentication
 * - iCloud Keychain sync (optional)
 */
export class iOSKeychainProvider extends NativeBridgeProvider {
  readonly name = 'iOS Keychain'
  readonly type = KeychainProviderType.IOS_KEYCHAIN

  readonly capabilities: KeychainProviderCapabilities = {
    canStore: true,
    canRetrieve: true,
    canDelete: true,
    canList: true,
    supportsPrompts: true,
    supportsSync: true, // With iCloud Keychain
    supportsBiometric: true, // Touch ID / Face ID
    supportsOffline: true,
  }

  protected getBridge(): NativeBridge | null {
    // Check for Capacitor
    if (window.Capacitor?.isNativePlatform?.() && window.Capacitor.getPlatform?.() === 'ios') {
      return window.Capacitor.Plugins?.SecureStorage || null
    }

    // Check for generic bridge with iOS platform
    if (window.nativeKeychain?.platform === 'ios') {
      return window.nativeKeychain
    }

    return null
  }
}

/**
 * macOS Keychain Provider
 *
 * Uses macOS Keychain Services through Electron or Tauri.
 *
 * Integration:
 * - Electron: keytar npm package
 * - Tauri: tauri-plugin-store with encryption
 *
 * Features:
 * - Login Keychain integration
 * - Touch ID authentication on supported Macs
 */
export class macOSKeychainProvider extends NativeBridgeProvider {
  readonly name = 'macOS Keychain'
  readonly type = KeychainProviderType.MACOS_KEYCHAIN

  readonly capabilities: KeychainProviderCapabilities = {
    canStore: true,
    canRetrieve: true,
    canDelete: true,
    canList: true,
    supportsPrompts: true,
    supportsSync: true, // With iCloud Keychain
    supportsBiometric: true, // Touch ID
    supportsOffline: true,
  }

  protected getBridge(): NativeBridge | null {
    // Check for Electron bridge
    if (window.electronBridge?.platform === 'darwin') {
      return window.electronBridge
    }

    // Check for generic bridge with macOS platform
    if (window.nativeKeychain?.platform === 'darwin' || window.nativeKeychain?.platform === 'macos') {
      return window.nativeKeychain
    }

    return null
  }
}

/**
 * Windows Credential Provider
 *
 * Uses Windows Credential Manager through Electron or Tauri.
 *
 * Integration:
 * - Electron: keytar npm package
 * - Tauri: windows-credentials or tauri-plugin-store
 * - .NET MAUI: Windows.Security.Credentials
 *
 * Features:
 * - Windows Hello integration
 * - Enterprise credential support
 */
export class WindowsCredentialProvider extends NativeBridgeProvider {
  readonly name = 'Windows Credential Manager'
  readonly type = KeychainProviderType.WINDOWS_CREDENTIAL

  readonly capabilities: KeychainProviderCapabilities = {
    canStore: true,
    canRetrieve: true,
    canDelete: true,
    canList: true,
    supportsPrompts: true,
    supportsSync: false,
    supportsBiometric: true, // Windows Hello
    supportsOffline: true,
  }

  protected getBridge(): NativeBridge | null {
    // Check for Electron bridge
    if (window.electronBridge?.platform === 'win32') {
      return window.electronBridge
    }

    // Check for generic bridge with Windows platform
    if (window.nativeKeychain?.platform === 'win32' || window.nativeKeychain?.platform === 'windows') {
      return window.nativeKeychain
    }

    return null
  }
}

/**
 * Linux Secret Provider
 *
 * Uses libsecret (GNOME Keyring) or KWallet through Electron or direct D-Bus.
 *
 * Integration:
 * - Electron: keytar npm package (uses libsecret)
 * - Direct: D-Bus Secret Service API
 * - CLI: secret-tool
 *
 * Supports:
 * - GNOME Keyring
 * - KWallet
 * - Any Secret Service API compliant store
 *
 * Tested on:
 * - Fedora
 * - Ubuntu
 * - Arch Linux
 */
export class LinuxSecretProvider extends NativeBridgeProvider {
  readonly name = 'Linux Secret Service'
  readonly type = KeychainProviderType.LINUX_SECRET

  readonly capabilities: KeychainProviderCapabilities = {
    canStore: true,
    canRetrieve: true,
    canDelete: true,
    canList: true,
    supportsPrompts: true,
    supportsSync: false,
    supportsBiometric: false,
    supportsOffline: true,
  }

  protected getBridge(): NativeBridge | null {
    // Check for Electron bridge
    if (window.electronBridge?.platform === 'linux') {
      return window.electronBridge
    }

    // Check for generic bridge with Linux platform
    if (window.nativeKeychain?.platform === 'linux') {
      return window.nativeKeychain
    }

    return null
  }
}

/**
 * Android Keystore Provider
 *
 * Uses Android Keystore through Capacitor or React Native.
 *
 * Integration:
 * - Capacitor: @capacitor-community/secure-storage-plugin
 * - React Native: react-native-keychain
 *
 * Features:
 * - Hardware-backed keystore on supported devices
 * - Biometric authentication
 */
export class AndroidKeystoreProvider extends NativeBridgeProvider {
  readonly name = 'Android Keystore'
  readonly type = KeychainProviderType.ANDROID_KEYSTORE

  readonly capabilities: KeychainProviderCapabilities = {
    canStore: true,
    canRetrieve: true,
    canDelete: true,
    canList: true,
    supportsPrompts: true,
    supportsSync: false,
    supportsBiometric: true,
    supportsOffline: true,
  }

  protected getBridge(): NativeBridge | null {
    // Check for Capacitor
    if (window.Capacitor?.isNativePlatform?.() && window.Capacitor.getPlatform?.() === 'android') {
      return window.Capacitor.Plugins?.SecureStorage || null
    }

    // Check for generic bridge with Android platform
    if (window.nativeKeychain?.platform === 'android') {
      return window.nativeKeychain
    }

    return null
  }
}
