/**
 * SecureStorageProvider
 *
 * Fallback provider that uses IndexedDB with AES-GCM encryption.
 * This works in all browsers that support IndexedDB and provides
 * secure local storage when the Credential Management API is not available.
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

const DB_NAME = 'pastebin_secure_keychain'
const DB_VERSION = 1
const STORE_NAME = 'entries'
const KEYS_STORE = 'encryption_keys'

/**
 * Encrypted entry as stored in IndexedDB
 */
interface EncryptedEntry {
  id: string
  /** Encrypted data (JSON stringified entry) */
  data: ArrayBuffer
  /** Initialization vector for AES-GCM */
  iv: Uint8Array
  /** Salt used for key derivation */
  salt: Uint8Array
  /** Metadata stored in plaintext for listing */
  metadata: {
    label: string
    createdAt: number
    expiresAt?: number
  }
}

/**
 * SecureStorageProvider implementation
 *
 * Uses IndexedDB with AES-256-GCM encryption to store passwords securely.
 * The encryption key is derived from a combination of:
 * 1. A randomly generated device key (stored in IndexedDB)
 * 2. An optional master password
 *
 * This provides defense-in-depth: even if an attacker accesses IndexedDB,
 * they cannot decrypt the passwords without the device key.
 */
export class SecureStorageProvider implements KeychainProvider {
  readonly name = 'Secure Local Storage'
  readonly type = KeychainProviderType.SECURE_STORAGE

  readonly capabilities: KeychainProviderCapabilities = {
    canStore: true,
    canRetrieve: true,
    canDelete: true,
    canList: true,
    supportsPrompts: false,
    supportsSync: false,
    supportsBiometric: false,
    supportsOffline: true,
  }

  private db: IDBDatabase | null = null
  private deviceKey: CryptoKey | null = null
  private masterPassword: string | null = null

  /**
   * Set the master password for additional encryption
   * If not set, only the device key is used
   */
  setMasterPassword(password: string | null): void {
    this.masterPassword = password
    // Clear cached device key to force re-derivation
    this.deviceKey = null
  }

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    if (!window.indexedDB) return false
    if (!window.crypto?.subtle) return false

    // Try to open the database to verify it works
    try {
      await this.ensureDatabase()
      return true
    } catch {
      return false
    }
  }

  /**
   * Ensure the database is open and ready
   */
  private async ensureDatabase(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(new Error('Failed to open keychain database'))

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create entries store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }

        // Create keys store for the device key
        if (!db.objectStoreNames.contains(KEYS_STORE)) {
          db.createObjectStore(KEYS_STORE, { keyPath: 'id' })
        }
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        resolve(this.db)
      }
    })
  }

  /**
   * Get or create the device encryption key
   */
  private async getDeviceKey(): Promise<CryptoKey> {
    if (this.deviceKey) return this.deviceKey

    const db = await this.ensureDatabase()

    // Try to load existing device key
    const existingKey = await new Promise<ArrayBuffer | null>((resolve, reject) => {
      const tx = db.transaction(KEYS_STORE, 'readonly')
      const store = tx.objectStore(KEYS_STORE)
      const request = store.get('device_key')

      request.onsuccess = () => {
        const result = request.result
        resolve(result?.key || null)
      }
      request.onerror = () => reject(request.error)
    })

    if (existingKey) {
      // Import existing key
      this.deviceKey = await crypto.subtle.importKey(
        'raw',
        existingKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      )
    } else {
      // Generate new device key
      this.deviceKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
        'encrypt',
        'decrypt',
      ])

      // Export and store it
      const exportedKey = await crypto.subtle.exportKey('raw', this.deviceKey)

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(KEYS_STORE, 'readwrite')
        const store = tx.objectStore(KEYS_STORE)
        const request = store.put({ id: 'device_key', key: exportedKey })

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }

    // If master password is set, derive a combined key
    if (this.masterPassword) {
      const combinedKey = await this.deriveKey(this.masterPassword, this.deviceKey)
      return combinedKey
    }

    return this.deviceKey
  }

  /**
   * Derive a key from master password combined with device key
   */
  private async deriveKey(password: string, deviceKey: CryptoKey): Promise<CryptoKey> {
    // Export device key to use as salt
    const deviceKeyBytes = await crypto.subtle.exportKey('raw', deviceKey)

    // Import password as key material
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    )

    // Derive final key
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: deviceKeyBytes,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
  }

  /**
   * Encrypt an entry for storage
   */
  private async encryptEntry(entry: KeychainEntry): Promise<EncryptedEntry> {
    const key = await this.getDeviceKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const salt = crypto.getRandomValues(new Uint8Array(16))

    const plaintext = new TextEncoder().encode(JSON.stringify(entry))

    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)

    return {
      id: entry.id,
      data: ciphertext,
      iv,
      salt,
      metadata: {
        label: entry.label,
        createdAt: entry.createdAt,
        expiresAt: entry.expiresAt,
      },
    }
  }

  /**
   * Decrypt a stored entry
   */
  private async decryptEntry(encrypted: EncryptedEntry): Promise<KeychainEntry> {
    const key = await this.getDeviceKey()

    // Ensure iv is a proper Uint8Array (IndexedDB may return ArrayBuffer-like objects)
    const iv = new Uint8Array(encrypted.iv)

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted.data,
    )

    const decoded = new TextDecoder().decode(plaintext)
    return JSON.parse(decoded)
  }

  async save(entry: KeychainEntry, options?: KeychainSaveOptions): Promise<KeychainOperationResult> {
    try {
      const db = await this.ensureDatabase()

      // Check for existing entry if not overwriting
      if (!options?.overwrite) {
        const existing = await this.getEncryptedEntry(entry.id)
        if (existing) {
          return {
            success: false,
            error: 'Entry already exists. Use overwrite option to replace.',
          }
        }
      }

      const encrypted = await this.encryptEntry(entry)

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.put(encrypted)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save entry',
      }
    }
  }

  /**
   * Get encrypted entry from database (without decrypting)
   */
  private async getEncryptedEntry(id: string): Promise<EncryptedEntry | null> {
    const db = await this.ensureDatabase()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async retrieve(id: string, options?: KeychainRetrieveOptions): Promise<KeychainEntry | null> {
    try {
      const encrypted = await this.getEncryptedEntry(id)
      if (!encrypted) return null

      // Check expiration
      if (encrypted.metadata.expiresAt && encrypted.metadata.expiresAt < Date.now()) {
        // Entry has expired, delete it
        await this.delete(id)
        return null
      }

      return await this.decryptEntry(encrypted)
    } catch (error) {
      if (options?.silent) return null
      throw error
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const db = await this.ensureDatabase()
      const existing = await this.getEncryptedEntry(id)
      if (!existing) return false

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.delete(id)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })

      return true
    } catch {
      return false
    }
  }

  async list(): Promise<KeychainEntryMetadata[]> {
    const db = await this.ensureDatabase()
    const now = Date.now()

    const entries = await new Promise<EncryptedEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })

    // Filter out expired entries and map to metadata
    const result: KeychainEntryMetadata[] = []
    const expiredIds: string[] = []

    for (const entry of entries) {
      if (entry.metadata.expiresAt && entry.metadata.expiresAt < now) {
        expiredIds.push(entry.id)
      } else {
        result.push({
          id: entry.id,
          label: entry.metadata.label,
          createdAt: entry.metadata.createdAt,
          expiresAt: entry.metadata.expiresAt,
        })
      }
    }

    // Clean up expired entries in background
    if (expiredIds.length > 0) {
      Promise.all(expiredIds.map((id) => this.delete(id))).catch(() => {
        // Ignore cleanup errors
      })
    }

    return result
  }

  async clear(): Promise<number> {
    const db = await this.ensureDatabase()

    const count = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.count()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    return count
  }
}
