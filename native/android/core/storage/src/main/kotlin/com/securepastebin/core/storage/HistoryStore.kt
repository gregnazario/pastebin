package com.securepastebin.core.storage

/**
 * Local history storage contract for Android implementation.
 */
interface HistoryStore {
    suspend fun upsert(entry: HistoryEntry)
    suspend fun list(): List<HistoryEntry>
    suspend fun delete(id: String)
}

data class HistoryEntry(
    val id: String,
    val fileName: String,
    val createdAtMillis: Long,
    val expiresAtMillis: Long,
)
