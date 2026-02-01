/**
 * Browser History Storage
 * 
 * Implements paste history storage using the browser's localStorage API.
 * This provides persistent storage across browser sessions but is limited
 * to the current device/browser.
 * 
 * Features:
 * - Automatic cleanup of expired entries
 * - Storage quota management (limits to MAX_ENTRIES)
 * - Event-based updates via storage events for multi-tab sync
 */

import type {
  PasteHistoryEntry,
  PasteHistoryQueryOptions,
  PasteHistoryQueryResult,
  PasteHistoryStorage,
  PasteHistoryEvent,
  PasteHistoryListener,
} from './types'

/** Default storage key for paste history */
const STORAGE_KEY = 'paste-history'

/** Maximum number of entries to store (prevents localStorage quota issues) */
const MAX_ENTRIES = 100

/** Maximum age for entries in milliseconds (90 days) */
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

/**
 * Browser-based paste history storage using localStorage
 */
export class BrowserHistoryStorage implements PasteHistoryStorage {
  private storageKey: string
  private listeners: Set<PasteHistoryListener> = new Set()
  private maxEntries: number

  constructor(options?: { storageKey?: string; maxEntries?: number }) {
    this.storageKey = options?.storageKey ?? STORAGE_KEY
    this.maxEntries = options?.maxEntries ?? MAX_ENTRIES

    // Listen for storage events from other tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent.bind(this))
    }
  }

  /**
   * Check if localStorage is available
   */
  isAvailable(): boolean {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false
    }

    // Test actual write/read capability
    const testKey = `${this.storageKey}-test`
    try {
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  /**
   * Add a new paste entry to history
   */
  async add(entry: PasteHistoryEntry): Promise<void> {
    if (!this.isAvailable()) {
      console.warn('BrowserHistoryStorage: localStorage not available')
      return
    }

    const entries = this.readEntries()

    // Check if entry already exists (by ID)
    const existingIndex = entries.findIndex((e) => e.id === entry.id)
    if (existingIndex >= 0) {
      // Update existing entry
      entries[existingIndex] = entry
    } else {
      // Add new entry at the beginning
      entries.unshift(entry)
    }

    // Enforce maximum entries limit
    const trimmedEntries = entries.slice(0, this.maxEntries)

    this.writeEntries(trimmedEntries)
    this.notify({ type: 'add', entry })
  }

  /**
   * Get a paste entry by ID
   */
  async get(id: string): Promise<PasteHistoryEntry | null> {
    if (!this.isAvailable()) {
      return null
    }

    const entries = this.readEntries()
    return entries.find((e) => e.id === id) ?? null
  }

  /**
   * Get all paste history entries with optional filtering
   */
  async getAll(options?: PasteHistoryQueryOptions): Promise<PasteHistoryQueryResult> {
    if (!this.isAvailable()) {
      return { entries: [], total: 0, hasMore: false }
    }

    let entries = this.readEntries()
    const now = Date.now()

    // Filter by content type
    if (options?.contentType && options.contentType !== 'all') {
      entries = entries.filter((e) => e.contentType === options.contentType)
    }

    // Filter out expired entries if requested
    if (options?.excludeExpired) {
      entries = entries.filter((e) => !e.expiresAt || e.expiresAt > now)
    }

    // Total count before pagination
    const total = entries.length

    // Sort entries
    const sortOrder = options?.sortOrder ?? 'desc'
    entries.sort((a, b) => {
      const diff = a.createdAt - b.createdAt
      return sortOrder === 'desc' ? -diff : diff
    })

    // Apply pagination
    const offset = options?.offset ?? 0
    const limit = options?.limit ?? total

    const paginatedEntries = entries.slice(offset, offset + limit)
    const hasMore = offset + limit < total

    return {
      entries: paginatedEntries,
      total,
      hasMore,
    }
  }

  /**
   * Remove a paste from history
   */
  async remove(id: string): Promise<void> {
    if (!this.isAvailable()) {
      return
    }

    const entries = this.readEntries()
    const entry = entries.find((e) => e.id === id)
    const filteredEntries = entries.filter((e) => e.id !== id)

    this.writeEntries(filteredEntries)

    if (entry) {
      this.notify({ type: 'remove', entry })
    }
  }

  /**
   * Remove multiple pastes from history
   */
  async removeMany(ids: string[]): Promise<void> {
    if (!this.isAvailable() || ids.length === 0) {
      return
    }

    const idSet = new Set(ids)
    const entries = this.readEntries()
    const removedEntries = entries.filter((e) => idSet.has(e.id))
    const filteredEntries = entries.filter((e) => !idSet.has(e.id))

    this.writeEntries(filteredEntries)

    if (removedEntries.length > 0) {
      this.notify({ type: 'remove', entries: removedEntries })
    }
  }

  /**
   * Clear all paste history
   */
  async clear(): Promise<void> {
    if (!this.isAvailable()) {
      return
    }

    try {
      localStorage.removeItem(this.storageKey)
      this.notify({ type: 'clear' })
    } catch (error) {
      console.error('BrowserHistoryStorage: Failed to clear history', error)
    }
  }

  /**
   * Get the total number of entries in history
   */
  async count(): Promise<number> {
    if (!this.isAvailable()) {
      return 0
    }

    return this.readEntries().length
  }

  /**
   * Remove all expired entries from history
   */
  async removeExpired(): Promise<number> {
    if (!this.isAvailable()) {
      return 0
    }

    const now = Date.now()
    const maxAge = now - MAX_AGE_MS
    const entries = this.readEntries()

    const filteredEntries = entries.filter((e) => {
      // Remove if explicitly expired
      if (e.expiresAt && e.expiresAt <= now) {
        return false
      }
      // Remove if too old (based on creation date)
      if (e.createdAt < maxAge) {
        return false
      }
      return true
    })

    const removedCount = entries.length - filteredEntries.length

    if (removedCount > 0) {
      this.writeEntries(filteredEntries)
    }

    return removedCount
  }

  /**
   * Subscribe to history change events
   */
  subscribe(listener: PasteHistoryListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Read entries from localStorage
   */
  private readEntries(): PasteHistoryEntry[] {
    try {
      const data = localStorage.getItem(this.storageKey)
      if (!data) {
        return []
      }

      const parsed = JSON.parse(data)
      if (!Array.isArray(parsed)) {
        console.warn('BrowserHistoryStorage: Invalid data format, resetting')
        return []
      }

      return parsed as PasteHistoryEntry[]
    } catch (error) {
      console.error('BrowserHistoryStorage: Failed to read entries', error)
      return []
    }
  }

  /**
   * Write entries to localStorage
   */
  private writeEntries(entries: PasteHistoryEntry[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(entries))
    } catch (error) {
      // Handle quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('BrowserHistoryStorage: Storage quota exceeded, removing old entries')
        // Try removing half of entries and retry
        const trimmedEntries = entries.slice(0, Math.floor(entries.length / 2))
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(trimmedEntries))
        } catch {
          console.error('BrowserHistoryStorage: Failed to write entries even after trimming')
        }
      } else {
        console.error('BrowserHistoryStorage: Failed to write entries', error)
      }
    }
  }

  /**
   * Notify all listeners of a change
   */
  private notify(event: PasteHistoryEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('BrowserHistoryStorage: Listener error', error)
      }
    }
  }

  /**
   * Handle storage events from other tabs
   */
  private handleStorageEvent(event: StorageEvent): void {
    if (event.key === this.storageKey) {
      this.notify({ type: 'update' })
    }
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent.bind(this))
    }
    this.listeners.clear()
  }
}

/**
 * Default singleton instance for convenience
 */
let defaultInstance: BrowserHistoryStorage | null = null

/**
 * Get the default browser history storage instance
 */
export function getBrowserHistoryStorage(): BrowserHistoryStorage {
  if (!defaultInstance) {
    defaultInstance = new BrowserHistoryStorage()
  }
  return defaultInstance
}
