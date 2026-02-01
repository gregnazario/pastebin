/**
 * WebCredentialProvider
 *
 * Uses the browser's Credential Management API to store passwords.
 * This integrates with the browser's built-in password manager, providing
 * a familiar experience for users and enabling sync across devices.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Credential_Management_API
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
 * Service identifier used as the "username" in the credential
 * The actual paste ID is stored in the password field metadata
 */
const SERVICE_PREFIX = 'pastebin-secure'

/**
 * Type declaration for PasswordCredential (not in all TypeScript lib definitions)
 */
declare class PasswordCredential extends Credential {
  constructor(data: PasswordCredentialData)
  readonly password: string
  readonly name: string
  readonly iconURL: string
}

interface PasswordCredentialData {
  id: string
  password: string
  name?: string
  iconURL?: string
}

interface PasswordCredentialRequestOptions extends CredentialRequestOptions {
  password?: boolean
}

/**
 * WebCredentialProvider implementation
 *
 * Uses the Credential Management API to store passwords in the browser's
 * built-in password manager. This provides:
 * - Native browser integration
 * - Familiar save/fill prompts
 * - Cross-device sync (if browser sync is enabled)
 * - Autofill support
 *
 * Limitations:
 * - Requires HTTPS context
 * - Limited metadata storage (we encode in the username field)
 * - Cannot list all stored credentials (privacy restriction)
 */
export class WebCredentialProvider implements KeychainProvider {
  readonly name = 'Browser Password Manager'
  readonly type = KeychainProviderType.WEB_CREDENTIAL

  readonly capabilities: KeychainProviderCapabilities = {
    canStore: true,
    canRetrieve: true,
    canDelete: false, // Credential API doesn't support deletion
    canList: false, // Privacy restriction
    supportsPrompts: true,
    supportsSync: true, // If browser sync is enabled
    supportsBiometric: false,
    supportsOffline: true,
  }

  /**
   * Local cache for entries (since we can't list from the API)
   * This is stored in localStorage as a backup reference
   */
  private getCacheKey(): string {
    return 'pastebin_credential_cache'
  }

  private getCache(): Map<string, KeychainEntryMetadata> {
    try {
      const cached = localStorage.getItem(this.getCacheKey())
      if (cached) {
        const entries = JSON.parse(cached) as KeychainEntryMetadata[]
        return new Map(entries.map((e) => [e.id, e]))
      }
    } catch {
      // Ignore cache errors
    }
    return new Map()
  }

  private setCache(cache: Map<string, KeychainEntryMetadata>): void {
    try {
      const entries = Array.from(cache.values())
      localStorage.setItem(this.getCacheKey(), JSON.stringify(entries))
    } catch {
      // Ignore cache errors
    }
  }

  async isAvailable(): Promise<boolean> {
    // Check if Credential Management API is available
    if (typeof window === 'undefined') return false
    if (typeof PasswordCredential === 'undefined') return false
    if (!navigator.credentials) return false

    // Check if we're in a secure context (HTTPS)
    if (!window.isSecureContext) return false

    return true
  }

  async save(entry: KeychainEntry, _options?: KeychainSaveOptions): Promise<KeychainOperationResult> {
    try {
      if (!(await this.isAvailable())) {
        return {
          success: false,
          error: 'Web Credential API is not available',
        }
      }

      // Create a PasswordCredential
      // We use the entry ID as part of the username to make it unique
      // and encode metadata in a way the browser can store
      const credential = new PasswordCredential({
        id: `${SERVICE_PREFIX}:${entry.id}`,
        password: entry.password,
        name: entry.label || entry.id,
        iconURL: `${window.location.origin}/favicon.ico`,
      })

      // Store the credential
      // The mediation option controls whether to show a prompt
      await navigator.credentials.store(credential)

      // If we get here without throwing, it was stored successfully
      // Update local cache
      const cache = this.getCache()
      cache.set(entry.id, {
        id: entry.id,
        label: entry.label,
        url: entry.url,
        createdAt: entry.createdAt,
        expiresAt: entry.expiresAt,
        notes: entry.notes,
      })
      this.setCache(cache)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error storing credential',
      }
    }
  }

  async retrieve(id: string, options?: KeychainRetrieveOptions): Promise<KeychainEntry | null> {
    try {
      if (!(await this.isAvailable())) {
        return null
      }

      // Request credentials that match our service prefix
      // The browser will show a picker if multiple credentials match
      const requestOptions: PasswordCredentialRequestOptions = {
        password: true,
        mediation: options?.promptUser ? 'required' : 'optional',
      }
      const credential = (await navigator.credentials.get(requestOptions)) as PasswordCredential | null

      if (!credential) {
        return null
      }

      // Check if this credential matches our ID
      if (credential.id !== `${SERVICE_PREFIX}:${id}`) {
        // User selected a different credential
        return null
      }

      // Get metadata from cache
      const cache = this.getCache()
      const metadata = cache.get(id)

      return {
        id,
        password: credential.password || '',
        label: metadata?.label || id,
        url: metadata?.url,
        createdAt: metadata?.createdAt || Date.now(),
        expiresAt: metadata?.expiresAt,
        notes: metadata?.notes,
      }
    } catch (error) {
      if (options?.silent) {
        return null
      }
      throw error
    }
  }

  async delete(id: string): Promise<boolean> {
    // Credential Management API doesn't support deletion
    // We can only remove from our local cache
    const cache = this.getCache()
    const existed = cache.has(id)
    cache.delete(id)
    this.setCache(cache)

    // Note: The actual credential remains in the browser
    // User must manually remove it from browser settings
    console.warn(
      'WebCredentialProvider.delete: Credential removed from cache but browser ' +
        'credentials must be manually removed from browser settings',
    )

    return existed
  }

  async list(): Promise<KeychainEntryMetadata[]> {
    // We can only return entries from our local cache
    // The Credential Management API doesn't allow listing all credentials
    const cache = this.getCache()

    // Filter out expired entries
    const now = Date.now()
    const entries: KeychainEntryMetadata[] = []

    for (const entry of cache.values()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        cache.delete(entry.id)
      } else {
        entries.push(entry)
      }
    }

    this.setCache(cache)
    return entries
  }

  async clear(): Promise<number> {
    // Clear local cache only
    const cache = this.getCache()
    const count = cache.size
    cache.clear()
    this.setCache(cache)

    console.warn(
      'WebCredentialProvider.clear: Cache cleared but browser ' +
        'credentials must be manually removed from browser settings',
    )

    return count
  }
}
