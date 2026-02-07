package com.securepastebin.feature.history

import com.securepastebin.core.storage.HistoryStore
import java.net.URI
import java.net.URLEncoder

/**
 * Presentation model for one entry in the history list.
 */
data class HistoryListItem(
    val id: String,
    val fileName: String,
    val createdAtMillis: Long,
    val expiresAtMillis: Long,
    val isExpired: Boolean,
    val shareUrl: String?,
)

/**
 * History feature service for listing and deleting persisted entries.
 */
class HistoryFeature(
    private val historyStore: HistoryStore,
    private val shareBaseUrl: String? = null,
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
                    shareUrl = buildShareUrl(entry.id),
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

    private fun buildShareUrl(id: String): String? {
        val base = shareBaseUrl ?: return null
        val normalizedBase = if (base.endsWith("/")) base.dropLast(1) else base
        val encodedID = URLEncoder.encode(id, Charsets.UTF_8.name()).replace("+", "%20")
        return URI.create("$normalizedBase/p/$encodedID").toString()
    }
}
