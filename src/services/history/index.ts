/**
 * Paste History Module
 * 
 * Provides a generic persistence layer for paste history with
 * browser-based storage as the default implementation.
 * 
 * Usage:
 * ```typescript
 * import { getBrowserHistoryStorage, type PasteHistoryEntry } from './services/history'
 * 
 * const storage = getBrowserHistoryStorage()
 * await storage.add(entry)
 * const { entries } = await storage.getAll()
 * ```
 */

export type {
  PasteHistoryEntry,
  PasteHistoryQueryOptions,
  PasteHistoryQueryResult,
  PasteHistoryStorage,
  PasteHistoryEvent,
  PasteHistoryEventType,
  PasteHistoryListener,
} from './types'

export { BrowserHistoryStorage, getBrowserHistoryStorage } from './BrowserHistoryStorage'
