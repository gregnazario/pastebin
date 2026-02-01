/**
 * Keychain Password Provider Types
 *
 * This module defines the interfaces and types for the pluggable keychain
 * password storage system. Providers implement these interfaces to enable
 * secure password storage across different platforms.
 */

/**
 * Supported keychain provider types
 */
export enum KeychainProviderType {
  /** Browser Credential Management API */
  WEB_CREDENTIAL = 'web-credential',
  /** Encrypted IndexedDB storage */
  SECURE_STORAGE = 'secure-storage',
  /** iOS Keychain Services */
  IOS_KEYCHAIN = 'ios-keychain',
  /** macOS Keychain Services */
  MACOS_KEYCHAIN = 'macos-keychain',
  /** Windows Credential Manager */
  WINDOWS_CREDENTIAL = 'windows-credential',
  /** Linux Secret Service (libsecret/GNOME Keyring/KWallet) */
  LINUX_SECRET = 'linux-secret',
  /** Android Keystore */
  ANDROID_KEYSTORE = 'android-keystore',
  /** Custom/third-party provider */
  CUSTOM = 'custom',
}

/**
 * Metadata for a keychain entry (without the actual password)
 */
export interface KeychainEntryMetadata {
  /** Unique identifier (typically the paste ID) */
  id: string
  /** User-friendly label for the entry */
  label: string
  /** URL associated with this entry */
  url?: string
  /** Timestamp when the entry was created */
  createdAt: number
  /** Timestamp when the entry expires (if applicable) */
  expiresAt?: number
  /** User-provided notes */
  notes?: string
}

/**
 * Full keychain entry including the password
 */
export interface KeychainEntry extends KeychainEntryMetadata {
  /** The stored password */
  password: string
}

/**
 * Options for saving a keychain entry
 */
export interface KeychainSaveOptions {
  /** If true, prompt user for confirmation before saving */
  promptUser?: boolean
  /** If true, overwrite existing entry with same ID */
  overwrite?: boolean
  /** Custom label for the entry (defaults to URL or ID) */
  label?: string
  /** Additional notes to store */
  notes?: string
}

/**
 * Options for retrieving a keychain entry
 */
export interface KeychainRetrieveOptions {
  /** If true, prompt user for confirmation before retrieving */
  promptUser?: boolean
  /** If true, return null instead of throwing on error */
  silent?: boolean
}

/**
 * Result of a keychain operation
 */
export interface KeychainOperationResult {
  success: boolean
  error?: string
  /** Indicates if user cancelled the operation */
  userCancelled?: boolean
}

/**
 * Provider capabilities
 */
export interface KeychainProviderCapabilities {
  /** Provider can store passwords */
  canStore: boolean
  /** Provider can retrieve passwords */
  canRetrieve: boolean
  /** Provider can delete passwords */
  canDelete: boolean
  /** Provider can list stored entries */
  canList: boolean
  /** Provider supports user prompts */
  supportsPrompts: boolean
  /** Provider syncs across devices */
  supportsSync: boolean
  /** Provider supports biometric authentication */
  supportsBiometric: boolean
  /** Provider works offline */
  supportsOffline: boolean
}

/**
 * Keychain provider interface
 *
 * All keychain providers must implement this interface. The interface
 * is designed to be platform-agnostic while supporting platform-specific
 * features through capabilities.
 */
export interface KeychainProvider {
  /** Human-readable name of the provider */
  readonly name: string

  /** Provider type identifier */
  readonly type: KeychainProviderType

  /** Provider capabilities */
  readonly capabilities: KeychainProviderCapabilities

  /**
   * Check if the provider is available on this platform/context
   * @returns Promise resolving to true if provider can be used
   */
  isAvailable(): Promise<boolean>

  /**
   * Save a password to the keychain
   * @param entry - The entry to save (must include password)
   * @param options - Optional save options
   * @returns Promise resolving to operation result
   */
  save(entry: KeychainEntry, options?: KeychainSaveOptions): Promise<KeychainOperationResult>

  /**
   * Retrieve a password from the keychain
   * @param id - The unique identifier of the entry
   * @param options - Optional retrieve options
   * @returns Promise resolving to the entry or null if not found
   */
  retrieve(id: string, options?: KeychainRetrieveOptions): Promise<KeychainEntry | null>

  /**
   * Delete an entry from the keychain
   * @param id - The unique identifier of the entry to delete
   * @returns Promise resolving to true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>

  /**
   * List all entries in the keychain (without passwords)
   * @returns Promise resolving to array of entry metadata
   */
  list(): Promise<KeychainEntryMetadata[]>

  /**
   * Clear all entries from the keychain
   * @returns Promise resolving to number of entries deleted
   */
  clear(): Promise<number>
}

/**
 * Configuration for the keychain service
 */
export interface KeychainServiceConfig {
  /** Preferred provider type (will fall back if unavailable) */
  preferredProvider?: KeychainProviderType
  /** Auto-save passwords after successful upload */
  autoSaveOnUpload?: boolean
  /** Auto-fill passwords when viewing pastes */
  autoFillOnView?: boolean
  /** Show prompts for keychain operations */
  showPrompts?: boolean
  /** Master password for SecureStorageProvider (if used) */
  masterPassword?: string
}

/**
 * Event types for keychain operations
 */
export enum KeychainEventType {
  PROVIDER_CHANGED = 'provider-changed',
  ENTRY_SAVED = 'entry-saved',
  ENTRY_DELETED = 'entry-deleted',
  ENTRIES_CLEARED = 'entries-cleared',
  ERROR = 'error',
}

/**
 * Event payload for keychain events
 */
export interface KeychainEvent {
  type: KeychainEventType
  provider?: KeychainProviderType
  entryId?: string
  error?: string
  timestamp: number
}

/**
 * Listener for keychain events
 */
export type KeychainEventListener = (event: KeychainEvent) => void
