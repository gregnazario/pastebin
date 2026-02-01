/**
 * KeychainService
 *
 * Central service for managing keychain operations with automatic
 * provider detection and selection. This service provides a unified
 * API for storing and retrieving passwords regardless of the underlying
 * platform.
 */

import {
  AndroidKeystoreProvider,
  LinuxSecretProvider,
  SecureStorageProvider,
  WebCredentialProvider,
  WindowsCredentialProvider,
  iOSKeychainProvider,
  macOSKeychainProvider,
} from './providers'
import type {
  KeychainEntry,
  KeychainEntryMetadata,
  KeychainEvent,
  KeychainEventListener,
  KeychainOperationResult,
  KeychainProvider,
  KeychainProviderCapabilities,
  KeychainRetrieveOptions,
  KeychainSaveOptions,
  KeychainServiceConfig,
} from './types'
import { KeychainEventType, KeychainProviderType } from './types'

/**
 * Provider registration entry
 */
interface ProviderRegistration {
  provider: KeychainProvider
  priority: number
}

/**
 * KeychainService - Singleton service for keychain operations
 *
 * Features:
 * - Automatic provider detection and selection
 * - Support for custom provider registration
 * - Event-based notifications
 * - Graceful fallback chain
 *
 * Usage:
 * ```typescript
 * const keychain = KeychainService.getInstance()
 * await keychain.initialize()
 *
 * // Save a password
 * await keychain.save({
 *   id: 'paste-123',
 *   password: 'secret',
 *   label: 'My Paste',
 *   createdAt: Date.now()
 * })
 *
 * // Retrieve a password
 * const entry = await keychain.retrieve('paste-123')
 * ```
 */
export class KeychainService {
  private static instance: KeychainService | null = null

  private providers: ProviderRegistration[] = []
  private activeProvider: KeychainProvider | null = null
  private config: KeychainServiceConfig = {}
  private listeners: Set<KeychainEventListener> = new Set()
  private initialized = false

  private constructor() {
    // Register default providers with priorities
    // Lower priority number = higher preference
    this.registerDefaultProviders()
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): KeychainService {
    if (!KeychainService.instance) {
      KeychainService.instance = new KeychainService()
    }
    return KeychainService.instance
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    KeychainService.instance = null
  }

  /**
   * Register default providers in priority order
   */
  private registerDefaultProviders(): void {
    // Native providers have highest priority (10-50)
    this.providers.push(
      { provider: new iOSKeychainProvider(), priority: 10 },
      { provider: new AndroidKeystoreProvider(), priority: 15 },
      { provider: new macOSKeychainProvider(), priority: 20 },
      { provider: new WindowsCredentialProvider(), priority: 25 },
      { provider: new LinuxSecretProvider(), priority: 30 },
    )

    // Browser credential API has medium priority (100)
    this.providers.push({ provider: new WebCredentialProvider(), priority: 100 })

    // Secure storage fallback has lowest priority (1000)
    this.providers.push({ provider: new SecureStorageProvider(), priority: 1000 })

    // Sort by priority
    this.providers.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Register a custom provider
   *
   * @param provider - The provider to register
   * @param priority - Priority (lower = higher preference). Default providers use 10-1000.
   */
  registerProvider(provider: KeychainProvider, priority = 500): void {
    // Remove existing provider of same type
    this.providers = this.providers.filter((p) => p.provider.type !== provider.type)

    this.providers.push({ provider, priority })
    this.providers.sort((a, b) => a.priority - b.priority)

    // If already initialized, re-check provider availability
    if (this.initialized) {
      this.selectProvider().catch(console.error)
    }
  }

  /**
   * Configure the service
   */
  configure(config: Partial<KeychainServiceConfig>): void {
    this.config = { ...this.config, ...config }

    // If master password is set, configure secure storage provider
    if (config.masterPassword) {
      const secureStorage = this.providers.find(
        (p) => p.provider.type === KeychainProviderType.SECURE_STORAGE,
      )?.provider as SecureStorageProvider | undefined

      if (secureStorage) {
        secureStorage.setMasterPassword(config.masterPassword)
      }
    }
  }

  /**
   * Initialize the service and select the best available provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    await this.selectProvider()
    this.initialized = true
  }

  /**
   * Select the best available provider
   */
  private async selectProvider(): Promise<void> {
    const previousProvider = this.activeProvider

    // If preferred provider is set, try it first
    if (this.config.preferredProvider) {
      const preferred = this.providers.find(
        (p) => p.provider.type === this.config.preferredProvider,
      )

      if (preferred && (await preferred.provider.isAvailable())) {
        this.activeProvider = preferred.provider
        this.emitEvent(KeychainEventType.PROVIDER_CHANGED)
        return
      }
    }

    // Try providers in priority order
    for (const { provider } of this.providers) {
      try {
        if (await provider.isAvailable()) {
          this.activeProvider = provider
          if (previousProvider?.type !== provider.type) {
            this.emitEvent(KeychainEventType.PROVIDER_CHANGED)
          }
          return
        }
      } catch {
        // Provider check failed, try next
      }
    }

    // No provider available
    this.activeProvider = null
    if (previousProvider) {
      this.emitEvent(KeychainEventType.PROVIDER_CHANGED)
    }
  }

  /**
   * Get the current active provider
   */
  getActiveProvider(): KeychainProvider | null {
    return this.activeProvider
  }

  /**
   * Get the current provider's capabilities
   */
  getCapabilities(): KeychainProviderCapabilities | null {
    return this.activeProvider?.capabilities || null
  }

  /**
   * Check if keychain is available
   */
  isAvailable(): boolean {
    return this.activeProvider !== null
  }

  /**
   * Get all registered providers
   */
  getProviders(): Array<{ provider: KeychainProvider; priority: number; isActive: boolean }> {
    return this.providers.map((p) => ({
      provider: p.provider,
      priority: p.priority,
      isActive: p.provider === this.activeProvider,
    }))
  }

  /**
   * Save a password to the keychain
   */
  async save(entry: KeychainEntry, options?: KeychainSaveOptions): Promise<KeychainOperationResult> {
    if (!this.activeProvider) {
      return { success: false, error: 'No keychain provider available' }
    }

    try {
      const result = await this.activeProvider.save(entry, options)

      if (result.success) {
        this.emitEvent(KeychainEventType.ENTRY_SAVED, entry.id)
      } else if (!result.userCancelled) {
        this.emitEvent(KeychainEventType.ERROR, entry.id, result.error)
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save to keychain'
      this.emitEvent(KeychainEventType.ERROR, entry.id, errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Retrieve a password from the keychain
   */
  async retrieve(id: string, options?: KeychainRetrieveOptions): Promise<KeychainEntry | null> {
    if (!this.activeProvider) {
      return null
    }

    try {
      return await this.activeProvider.retrieve(id, options)
    } catch (error) {
      if (!options?.silent) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve from keychain'
        this.emitEvent(KeychainEventType.ERROR, id, errorMessage)
      }
      return null
    }
  }

  /**
   * Delete an entry from the keychain
   */
  async delete(id: string): Promise<boolean> {
    if (!this.activeProvider) {
      return false
    }

    try {
      const result = await this.activeProvider.delete(id)

      if (result) {
        this.emitEvent(KeychainEventType.ENTRY_DELETED, id)
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete from keychain'
      this.emitEvent(KeychainEventType.ERROR, id, errorMessage)
      return false
    }
  }

  /**
   * List all entries in the keychain
   */
  async list(): Promise<KeychainEntryMetadata[]> {
    if (!this.activeProvider) {
      return []
    }

    try {
      return await this.activeProvider.list()
    } catch {
      return []
    }
  }

  /**
   * Clear all entries from the keychain
   */
  async clear(): Promise<number> {
    if (!this.activeProvider) {
      return 0
    }

    try {
      const count = await this.activeProvider.clear()

      if (count > 0) {
        this.emitEvent(KeychainEventType.ENTRIES_CLEARED)
      }

      return count
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear keychain'
      this.emitEvent(KeychainEventType.ERROR, undefined, errorMessage)
      return 0
    }
  }

  /**
   * Check if a specific entry exists (without retrieving the password)
   */
  async exists(id: string): Promise<boolean> {
    if (!this.activeProvider?.capabilities.canList) {
      // Try to retrieve with silent option
      const entry = await this.retrieve(id, { silent: true })
      return entry !== null
    }

    const entries = await this.list()
    return entries.some((e) => e.id === id)
  }

  /**
   * Add an event listener
   */
  addEventListener(listener: KeychainEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Remove an event listener
   */
  removeEventListener(listener: KeychainEventListener): void {
    this.listeners.delete(listener)
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(type: KeychainEventType, entryId?: string, error?: string): void {
    const event: KeychainEvent = {
      type,
      provider: this.activeProvider?.type,
      entryId,
      error,
      timestamp: Date.now(),
    }

    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch {
        // Ignore listener errors
      }
    }
  }
}

// Export singleton getter for convenience
export const getKeychainService = (): KeychainService => KeychainService.getInstance()
