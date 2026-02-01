/**
 * useKeychain - React hook for keychain operations
 *
 * Provides a convenient interface for using the KeychainService in React components.
 * Handles initialization, state management, and event subscriptions automatically.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  type KeychainEntry,
  type KeychainEntryMetadata,
  KeychainEventType,
  type KeychainOperationResult,
  type KeychainProviderCapabilities,
  type KeychainProviderType,
  type KeychainRetrieveOptions,
  type KeychainSaveOptions,
  getKeychainService,
} from '../services/keychain'

/**
 * State returned by the useKeychain hook
 */
export interface UseKeychainState {
  /** Whether the keychain service is initialized */
  isInitialized: boolean
  /** Whether a keychain provider is available */
  isAvailable: boolean
  /** Whether an operation is in progress */
  isLoading: boolean
  /** The active provider type */
  providerType: KeychainProviderType | null
  /** The active provider name */
  providerName: string | null
  /** Provider capabilities */
  capabilities: KeychainProviderCapabilities | null
  /** List of saved entries (metadata only) */
  entries: KeychainEntryMetadata[]
  /** Last error message */
  error: string | null
}

/**
 * Actions returned by the useKeychain hook
 */
export interface UseKeychainActions {
  /** Save a password to the keychain */
  save: (entry: KeychainEntry, options?: KeychainSaveOptions) => Promise<KeychainOperationResult>
  /** Retrieve a password from the keychain */
  retrieve: (id: string, options?: KeychainRetrieveOptions) => Promise<KeychainEntry | null>
  /** Delete an entry from the keychain */
  delete: (id: string) => Promise<boolean>
  /** Check if an entry exists */
  exists: (id: string) => Promise<boolean>
  /** Clear all entries */
  clear: () => Promise<number>
  /** Refresh the entries list */
  refreshEntries: () => Promise<void>
  /** Clear the current error */
  clearError: () => void
}

/**
 * Combined return type for useKeychain hook
 */
export type UseKeychainReturn = UseKeychainState & UseKeychainActions

/**
 * Options for the useKeychain hook
 */
export interface UseKeychainOptions {
  /** Auto-initialize on mount (default: true) */
  autoInitialize?: boolean
  /** Auto-refresh entries on mount and after operations (default: true) */
  autoRefresh?: boolean
  /** Master password for secure storage provider */
  masterPassword?: string
}

/**
 * React hook for keychain operations
 *
 * @example
 * ```tsx
 * function PasswordManager() {
 *   const {
 *     isAvailable,
 *     entries,
 *     save,
 *     retrieve,
 *     delete: deleteEntry,
 *   } = useKeychain()
 *
 *   if (!isAvailable) {
 *     return <p>Keychain not available</p>
 *   }
 *
 *   return (
 *     <ul>
 *       {entries.map(entry => (
 *         <li key={entry.id}>
 *           {entry.label}
 *           <button onClick={() => deleteEntry(entry.id)}>Delete</button>
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useKeychain(options: UseKeychainOptions = {}): UseKeychainReturn {
  const { autoInitialize = true, autoRefresh = true, masterPassword } = options

  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [entries, setEntries] = useState<KeychainEntryMetadata[]>([])
  const [error, setError] = useState<string | null>(null)
  const [providerInfo, setProviderInfo] = useState<{
    type: KeychainProviderType | null
    name: string | null
    capabilities: KeychainProviderCapabilities | null
  }>({
    type: null,
    name: null,
    capabilities: null,
  })

  const service = useMemo(() => getKeychainService(), [])

  // Update provider info
  const updateProviderInfo = useCallback(() => {
    const provider = service.getActiveProvider()
    setProviderInfo({
      type: provider?.type || null,
      name: provider?.name || null,
      capabilities: provider?.capabilities || null,
    })
  }, [service])

  // Refresh entries list
  const refreshEntries = useCallback(async () => {
    if (!service.isAvailable()) {
      setEntries([])
      return
    }

    try {
      const list = await service.list()
      setEntries(list)
    } catch {
      // Silently fail - entries list is not critical
      setEntries([])
    }
  }, [service])

  // Initialize the service
  useEffect(() => {
    if (!autoInitialize) return

    const init = async () => {
      try {
        // Configure master password if provided
        if (masterPassword) {
          service.configure({ masterPassword })
        }

        await service.initialize()
        setIsInitialized(true)
        updateProviderInfo()

        if (autoRefresh) {
          await refreshEntries()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize keychain')
      }
    }

    init()
  }, [autoInitialize, masterPassword, service, updateProviderInfo, autoRefresh, refreshEntries])

  // Subscribe to events
  useEffect(() => {
    const unsubscribe = service.addEventListener((event) => {
      switch (event.type) {
        case KeychainEventType.PROVIDER_CHANGED:
          updateProviderInfo()
          if (autoRefresh) {
            refreshEntries()
          }
          break
        case KeychainEventType.ENTRY_SAVED:
        case KeychainEventType.ENTRY_DELETED:
        case KeychainEventType.ENTRIES_CLEARED:
          if (autoRefresh) {
            refreshEntries()
          }
          break
        case KeychainEventType.ERROR:
          if (event.error) {
            setError(event.error)
          }
          break
      }
    })

    return unsubscribe
  }, [service, updateProviderInfo, refreshEntries, autoRefresh])

  // Actions
  const save = useCallback(
    async (entry: KeychainEntry, saveOptions?: KeychainSaveOptions): Promise<KeychainOperationResult> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await service.save(entry, saveOptions)
        if (!result.success && !result.userCancelled) {
          setError(result.error || 'Failed to save')
        }
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save'
        setError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setIsLoading(false)
      }
    },
    [service],
  )

  const retrieve = useCallback(
    async (id: string, retrieveOptions?: KeychainRetrieveOptions): Promise<KeychainEntry | null> => {
      setIsLoading(true)
      setError(null)

      try {
        return await service.retrieve(id, retrieveOptions)
      } catch (err) {
        if (!retrieveOptions?.silent) {
          setError(err instanceof Error ? err.message : 'Failed to retrieve')
        }
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [service],
  )

  const deleteEntry = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        return await service.delete(id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete')
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [service],
  )

  const exists = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        return await service.exists(id)
      } catch {
        return false
      }
    },
    [service],
  )

  const clear = useCallback(async (): Promise<number> => {
    setIsLoading(true)
    setError(null)

    try {
      return await service.clear()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear')
      return 0
    } finally {
      setIsLoading(false)
    }
  }, [service])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    isInitialized,
    isAvailable: service.isAvailable(),
    isLoading,
    providerType: providerInfo.type,
    providerName: providerInfo.name,
    capabilities: providerInfo.capabilities,
    entries,
    error,

    // Actions
    save,
    retrieve,
    delete: deleteEntry,
    exists,
    clear,
    refreshEntries,
    clearError,
  }
}

/**
 * Simplified hook for checking keychain availability
 */
export function useKeychainAvailable(): boolean {
  const { isAvailable } = useKeychain({ autoRefresh: false })
  return isAvailable
}

/**
 * Hook for getting a specific keychain entry
 *
 * @param id - The entry ID to retrieve
 * @param autoRetrieve - Whether to auto-retrieve on mount (default: false for security)
 */
export function useKeychainEntry(
  id: string,
  autoRetrieve = false,
): {
  entry: KeychainEntry | null
  isLoading: boolean
  error: string | null
  retrieve: () => Promise<void>
} {
  const [entry, setEntry] = useState<KeychainEntry | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const service = useMemo(() => getKeychainService(), [])

  const retrieve = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      await service.initialize()
      const result = await service.retrieve(id)
      setEntry(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve entry')
    } finally {
      setIsLoading(false)
    }
  }, [service, id])

  useEffect(() => {
    if (autoRetrieve) {
      retrieve()
    }
  }, [autoRetrieve, retrieve])

  return { entry, isLoading, error, retrieve }
}
