/**
 * Paste History Component
 * 
 * Displays a list of previously uploaded pastes stored in browser history.
 * Provides functionality to view, copy links, and delete history entries.
 */

import { useCallback, useState } from 'react'
import { usePasteHistory } from '../hooks/usePasteHistory'
import type { PasteHistoryEntry } from '../services/history'
import {
  ClipboardIcon,
  ExternalLinkIcon,
  FileIcon,
  HistoryIcon,
  NoteIcon,
  TrashIcon,
} from './Icons'
import { useToast } from './Toast'

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Format date for display
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
  }
  if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * Check if a paste is expired
 */
function isExpired(entry: PasteHistoryEntry): boolean {
  return entry.expiresAt ? entry.expiresAt < Date.now() : false
}

/**
 * Single paste history item
 */
function PasteHistoryItem({
  entry,
  onRemove,
  onCopyLink,
}: {
  entry: PasteHistoryEntry
  onRemove: (id: string) => void
  onCopyLink: (url: string) => void
}) {
  const expired = isExpired(entry)

  return (
    <div className={`history-item ${expired ? 'expired' : ''}`}>
      <div className="history-item-icon">
        {entry.contentType === 'note' ? <NoteIcon size={24} /> : <FileIcon size={24} />}
      </div>

      <div className="history-item-content">
        <div className="history-item-name" title={entry.name}>
          {entry.encryptedMetadata ? (
            <span className="encrypted-name">Encrypted file</span>
          ) : (
            entry.name
          )}
        </div>
        <div className="history-item-meta">
          <span className="history-item-size">{formatFileSize(entry.size)}</span>
          <span className="history-item-separator">·</span>
          <span className="history-item-date">{formatDate(entry.createdAt)}</span>
          {expired && (
            <>
              <span className="history-item-separator">·</span>
              <span className="history-item-expired">Expired</span>
            </>
          )}
        </div>
        {entry.preview && !entry.encryptedMetadata && (
          <div className="history-item-preview" title={entry.preview}>
            {entry.preview}
          </div>
        )}
      </div>

      <div className="history-item-actions">
        {!expired && (
          <>
            <button
              type="button"
              className="history-action-btn"
              onClick={() => onCopyLink(entry.url)}
              title="Copy shareable link"
            >
              <ClipboardIcon size={16} />
            </button>
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="history-action-btn"
              title="Open in new tab"
            >
              <ExternalLinkIcon size={16} />
            </a>
          </>
        )}
        <button
          type="button"
          className="history-action-btn history-action-delete"
          onClick={() => onRemove(entry.id)}
          title="Remove from history"
        >
          <TrashIcon size={16} />
        </button>
      </div>
    </div>
  )
}

/**
 * Empty state when no history exists
 */
function EmptyHistory() {
  return (
    <div className="history-empty">
      <HistoryIcon size={48} />
      <p>No paste history yet</p>
      <span>Your uploaded files and notes will appear here</span>
    </div>
  )
}

/**
 * Unavailable state when storage is not available
 */
function HistoryUnavailable() {
  return (
    <div className="history-unavailable">
      <HistoryIcon size={32} />
      <p>History not available</p>
      <span>Browser storage is disabled or unavailable</span>
    </div>
  )
}

interface PasteHistoryProps {
  /** Maximum number of items to show (defaults to all) */
  maxItems?: number
  /** Whether to show the header */
  showHeader?: boolean
  /** Whether to show the clear all button */
  showClearAll?: boolean
  /** Compact mode for embedding in other pages */
  compact?: boolean
}

/**
 * Paste History Component
 * Displays a list of previously uploaded pastes
 */
export function PasteHistory({
  maxItems,
  showHeader = true,
  showClearAll = true,
  compact = false,
}: PasteHistoryProps) {
  const { showToast } = useToast()
  const [confirmClear, setConfirmClear] = useState(false)
  const {
    entries,
    total,
    hasMore,
    isLoading,
    isAvailable,
    removePaste,
    clearHistory,
    loadMore,
  } = usePasteHistory({
    queryOptions: {
      limit: maxItems ?? 50,
      sortOrder: 'desc',
    },
  })

  /**
   * Copy paste URL to clipboard
   */
  const handleCopyLink = useCallback(
    async (url: string) => {
      try {
        await navigator.clipboard.writeText(url)
        showToast('Link copied! Password still required to decrypt.', 'success')
      } catch {
        showToast('Failed to copy link', 'error')
      }
    },
    [showToast],
  )

  /**
   * Remove a paste from history
   */
  const handleRemove = useCallback(
    async (id: string) => {
      try {
        await removePaste(id)
        showToast('Removed from history', 'success')
      } catch {
        showToast('Failed to remove from history', 'error')
      }
    },
    [removePaste, showToast],
  )

  /**
   * Clear all history
   */
  const handleClearAll = useCallback(async () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }

    try {
      await clearHistory()
      showToast('History cleared', 'success')
    } catch {
      showToast('Failed to clear history', 'error')
    } finally {
      setConfirmClear(false)
    }
  }, [confirmClear, clearHistory, showToast])

  // Cancel confirm state when clicking away
  const handleCancelConfirm = useCallback(() => {
    setConfirmClear(false)
  }, [])

  // If storage is not available
  if (!isAvailable) {
    return <HistoryUnavailable />
  }

  // Show loading state only on initial load
  if (isLoading && entries.length === 0) {
    return (
      <div className={`paste-history ${compact ? 'compact' : ''}`}>
        {showHeader && (
          <div className="history-header">
            <h2>
              <HistoryIcon size="1em" /> Recent Pastes
            </h2>
          </div>
        )}
        <div className="history-loading">Loading history...</div>
      </div>
    )
  }

  return (
    <div className={`paste-history ${compact ? 'compact' : ''}`}>
      {showHeader && (
        <div className="history-header">
          <h2>
            <HistoryIcon size="1em" /> Recent Pastes
          </h2>
          {showClearAll && entries.length > 0 && (
            <div className="history-header-actions">
              {confirmClear ? (
                <>
                  <span className="confirm-text">Clear all history?</span>
                  <button
                    type="button"
                    className="history-clear-btn confirm"
                    onClick={handleClearAll}
                  >
                    Yes, clear
                  </button>
                  <button
                    type="button"
                    className="history-clear-btn cancel"
                    onClick={handleCancelConfirm}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" className="history-clear-btn" onClick={handleClearAll}>
                  <TrashIcon size={14} /> Clear all
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyHistory />
      ) : (
        <>
          <div className="history-list">
            {entries.map((entry) => (
              <PasteHistoryItem
                key={entry.id}
                entry={entry}
                onRemove={handleRemove}
                onCopyLink={handleCopyLink}
              />
            ))}
          </div>

          {hasMore && (
            <div className="history-load-more">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoading}
                className="load-more-btn"
              >
                {isLoading ? 'Loading...' : `Load more (${total - entries.length} remaining)`}
              </button>
            </div>
          )}

          <div className="history-footer">
            <span className="history-count">
              {entries.length} of {total} paste{total !== 1 ? 's' : ''} in history
            </span>
            <span className="history-note">Stored locally in your browser</span>
          </div>
        </>
      )}
    </div>
  )
}
