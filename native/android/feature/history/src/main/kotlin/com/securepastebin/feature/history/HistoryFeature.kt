package com.securepastebin.feature.history

import com.securepastebin.core.storage.HistoryStore

/**
 * Presentation model for one entry in the history list.
 */
data class HistoryListItem(
    val id: String,
    val fileName: String,
    val createdAtMillis: Long,
    val expiresAtMillis: Long,
    val isExpired: Boolean,
)

/**
 * History feature service for listing and deleting persisted entries.
 */
class HistoryFeature(
    private val historyStore: HistoryStore,
    private val nowMillis: () -> Long = { System.currentTimeMillis() },
) {
    /**
     * Returns history entries sorted by creation time descending.
     * Optionally excludes expired entries.
     */
    suspend fun list(includeExpired: Boolean): List<HistoryListItem> {
        val now = nowMillis()
        return historyStore
            .list()
            .map { entry ->
                val expired = entry.expiresAtMillis > 0 && entry.expiresAtMillis <= now
                HistoryListItem(
                    id = entry.id,
                    fileName = entry.fileName,
                    createdAtMillis = entry.createdAtMillis,
                    expiresAtMillis = entry.expiresAtMillis,
                    isExpired = expired,
                )
            }
            .filter { includeExpired || !it.isExpired }
            .sortedByDescending { it.createdAtMillis }
    }

    /**
     * Deletes one history entry by id.
     */
    suspend fun delete(id: String) {
        historyStore.delete(id)
    }
}
