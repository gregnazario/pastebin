/**
 * usePasteHistory Hook
 * 
 * React hook for managing paste history with automatic state synchronization.
 * Provides a convenient interface for reading and manipulating paste history
 * with support for multi-tab synchronization.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getBrowserHistoryStorage,
  type PasteHistoryEntry,
  type PasteHistoryQueryOptions,
  type PasteHistoryStorage,
} from '../services/history'

/** Default query options */
const DEFAULT_QUERY_OPTIONS: PasteHistoryQueryOptions = {
  limit: 50,
  offset: 0,
  sortOrder: 'desc',
  contentType: 'all',
  excludeExpired: false,
}

interface UsePasteHistoryOptions {
  /** Custom storage implementation (defaults to BrowserHistoryStorage) */
  storage?: PasteHistoryStorage
  /** Query options for fetching history */
  queryOptions?: PasteHistoryQueryOptions
  /** Auto-refresh when storage changes in other tabs */
  autoRefresh?: boolean
  /** Automatically remove expired entries on load */
  autoCleanup?: boolean
}

interface UsePasteHistoryReturn {
  /** List of paste history entries */
  entries: PasteHistoryEntry[]
  /** Total number of entries (may be more than entries.length if paginated) */
  total: number
  /** Whether there are more entries to load */
  hasMore: boolean
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Whether storage is available */
  isAvailable: boolean
  /** Add a new paste to history */
  addPaste: (entry: PasteHistoryEntry) => Promise<void>
  /** Remove a paste from history */
  removePaste: (id: string) => Promise<void>
  /** Remove multiple pastes from history */
  removePastes: (ids: string[]) => Promise<void>
  /** Clear all paste history */
  clearHistory: () => Promise<void>
  /** Refresh the history list */
  refresh: () => Promise<void>
  /** Load more entries (for pagination) */
  loadMore: () => Promise<void>
}

/**
 * Hook for managing paste history
 */
export function usePasteHistory(options: UsePasteHistoryOptions = {}): UsePasteHistoryReturn {
  const {
    storage = getBrowserHistoryStorage(),
    queryOptions = DEFAULT_QUERY_OPTIONS,
    autoRefresh = true,
    autoCleanup = true,
  } = options

  const [entries, setEntries] = useState<PasteHistoryEntry[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [offset, setOffset] = useState(queryOptions.offset ?? 0)
  const [initialized, setInitialized] = useState(false)

  // Memoize merged options to prevent recreation on every render
  const mergedOptions = useMemo<PasteHistoryQueryOptions>(
    () => ({
      ...DEFAULT_QUERY_OPTIONS,
      ...queryOptions,
    }),
    [queryOptions],
  )

  // Check storage availability
  const isAvailable = storage.isAvailable()

  /**
   * Fetch history entries
   */
  const fetchHistory = useCallback(
    async (resetOffset = false) => {
      if (!isAvailable) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const currentOffset = resetOffset ? 0 : offset
        const result = await storage.getAll({
          ...mergedOptions,
          offset: currentOffset,
        })

        if (resetOffset) {
          setEntries(result.entries)
          setOffset(currentOffset + (mergedOptions.limit ?? result.entries.length))
        } else {
          // Append for "load more"
          setEntries((prev) =>
            currentOffset === 0 ? result.entries : [...prev, ...result.entries],
          )
          setOffset(currentOffset + result.entries.length)
        }

        setTotal(result.total)
        setHasMore(result.hasMore)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch history'))
      } finally {
        setIsLoading(false)
      }
    },
    [isAvailable, storage, offset, mergedOptions],
  )

  /**
   * Refresh the history list (reset pagination)
   */
  const refresh = useCallback(async () => {
    setOffset(0)
    await fetchHistory(true)
  }, [fetchHistory])

  /**
   * Load more entries (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return
    await fetchHistory(false)
  }, [hasMore, isLoading, fetchHistory])

  /**
   * Add a new paste to history
   */
  const addPaste = useCallback(
    async (entry: PasteHistoryEntry) => {
      if (!isAvailable) return

      try {
        await storage.add(entry)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to add paste'))
        throw err
      }
    },
    [isAvailable, storage, refresh],
  )

  /**
   * Remove a paste from history
   */
  const removePaste = useCallback(
    async (id: string) => {
      if (!isAvailable) return

      try {
        await storage.remove(id)
        // Optimistic update
        setEntries((prev) => prev.filter((e) => e.id !== id))
        setTotal((prev) => Math.max(0, prev - 1))
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to remove paste'))
        // Refresh on error to sync state
        await refresh()
        throw err
      }
    },
    [isAvailable, storage, refresh],
  )

  /**
   * Remove multiple pastes from history
   */
  const removePastes = useCallback(
    async (ids: string[]) => {
      if (!isAvailable || ids.length === 0) return

      try {
        await storage.removeMany(ids)
        // Optimistic update
        const idSet = new Set(ids)
        setEntries((prev) => prev.filter((e) => !idSet.has(e.id)))
        setTotal((prev) => Math.max(0, prev - ids.length))
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to remove pastes'))
        await refresh()
        throw err
      }
    },
    [isAvailable, storage, refresh],
  )

  /**
   * Clear all paste history
   */
  const clearHistory = useCallback(async () => {
    if (!isAvailable) return

    try {
      await storage.clear()
      setEntries([])
      setTotal(0)
      setHasMore(false)
      setOffset(0)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to clear history'))
      throw err
    }
  }, [isAvailable, storage])

  // Initial load - only run once on mount
  useEffect(() => {
    if (initialized) return

    const init = async () => {
      // Run cleanup on initial load if enabled
      if (autoCleanup && isAvailable) {
        try {
          await storage.removeExpired()
        } catch {
          // Ignore cleanup errors
        }
      }

      await fetchHistory(true)
      setInitialized(true)
    }

    init()
  }, [initialized, autoCleanup, isAvailable, storage, fetchHistory])

  // Subscribe to storage changes for multi-tab sync
  useEffect(() => {
    if (!autoRefresh || !isAvailable) return

    // Check if storage supports subscriptions (BrowserHistoryStorage specific)
    const browserStorage = storage as { subscribe?: (listener: () => void) => () => void }
    if (typeof browserStorage.subscribe !== 'function') {
      return
    }

    const unsubscribe = browserStorage.subscribe(() => {
      // Refresh on external changes
      refresh()
    })

    return unsubscribe
  }, [autoRefresh, isAvailable, storage, refresh])

  return {
    entries,
    total,
    hasMore,
    isLoading,
    error,
    isAvailable,
    addPaste,
    removePaste,
    removePastes,
    clearHistory,
    refresh,
    loadMore,
  }
}

/**
 * Create a paste history entry from upload result
 * Helper function to construct a PasteHistoryEntry from upload data
 */
export function createPasteHistoryEntry(params: {
  fileId: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  expiresAt?: number
  encryptedMetadata: boolean
  contentType: 'file' | 'note'
  preview?: string
}): PasteHistoryEntry {
  return {
    id: params.fileId,
    name: params.fileName,
    size: params.fileSize,
    mimeType: params.mimeType,
    createdAt: Date.now(),
    expiresAt: params.expiresAt,
    url: params.url,
    encryptedMetadata: params.encryptedMetadata,
    contentType: params.contentType,
    preview: params.preview,
  }
}
