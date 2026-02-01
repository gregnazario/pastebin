/**
 * Paste History Types
 * 
 * Defines the types and interfaces for the paste history persistence layer.
 * This is designed to be storage-agnostic, allowing for different implementations
 * (browser localStorage, IndexedDB, server-side, etc.)
 */

/**
 * Represents a single paste history entry
 */
export interface PasteHistoryEntry {
  /** Unique identifier for the paste */
  id: string
  /** Original filename or note title */
  name: string
  /** File size in bytes */
  size: number
  /** MIME type of the content */
  mimeType: string
  /** Timestamp when the paste was created */
  createdAt: number
  /** Timestamp when the paste expires (if applicable) */
  expiresAt?: number
  /** The shareable URL for the paste (without the key fragment) */
  url: string
  /** Whether metadata was encrypted */
  encryptedMetadata: boolean
  /** Type of content: 'file' or 'note' */
  contentType: 'file' | 'note'
  /** Optional preview of content (first N characters for notes) */
  preview?: string
}

/**
 * Options for querying paste history
 */
export interface PasteHistoryQueryOptions {
  /** Maximum number of entries to return */
  limit?: number
  /** Number of entries to skip (for pagination) */
  offset?: number
  /** Sort order by creation date */
  sortOrder?: 'asc' | 'desc'
  /** Filter by content type */
  contentType?: 'file' | 'note' | 'all'
  /** Filter out expired entries */
  excludeExpired?: boolean
}

/**
 * Result of a paginated query
 */
export interface PasteHistoryQueryResult {
  /** The history entries matching the query */
  entries: PasteHistoryEntry[]
  /** Total number of entries (before pagination) */
  total: number
  /** Whether there are more entries after this page */
  hasMore: boolean
}

/**
 * Generic storage interface for paste history
 * 
 * Implementations can use localStorage, IndexedDB, server-side storage, etc.
 * All methods return Promises to support async storage backends.
 */
export interface PasteHistoryStorage {
  /**
   * Add a new paste to history
   * @param entry The paste entry to add
   */
  add(entry: PasteHistoryEntry): Promise<void>

  /**
   * Get a paste entry by ID
   * @param id The paste ID
   * @returns The entry or null if not found
   */
  get(id: string): Promise<PasteHistoryEntry | null>

  /**
   * Get all paste history entries with optional filtering
   * @param options Query options for filtering, sorting, and pagination
   */
  getAll(options?: PasteHistoryQueryOptions): Promise<PasteHistoryQueryResult>

  /**
   * Remove a paste from history
   * @param id The paste ID to remove
   */
  remove(id: string): Promise<void>

  /**
   * Remove multiple pastes from history
   * @param ids Array of paste IDs to remove
   */
  removeMany(ids: string[]): Promise<void>

  /**
   * Clear all paste history
   */
  clear(): Promise<void>

  /**
   * Get the total number of entries in history
   */
  count(): Promise<number>

  /**
   * Remove all expired entries from history
   * @returns Number of entries removed
   */
  removeExpired(): Promise<number>

  /**
   * Check if the storage is available
   * (e.g., localStorage might be disabled in private browsing)
   */
  isAvailable(): boolean
}

/**
 * Event types for history changes
 */
export type PasteHistoryEventType = 'add' | 'remove' | 'clear' | 'update'

/**
 * Event payload for history changes
 */
export interface PasteHistoryEvent {
  type: PasteHistoryEventType
  entry?: PasteHistoryEntry
  entries?: PasteHistoryEntry[]
}

/**
 * Listener function for history change events
 */
export type PasteHistoryListener = (event: PasteHistoryEvent) => void
