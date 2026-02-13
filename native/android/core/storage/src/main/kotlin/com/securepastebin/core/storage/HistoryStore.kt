package com.securepastebin.core.storage

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

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

/**
 * SharedPreferences-backed history persistence for Android clients.
 */
class SharedPreferencesHistoryStore(
    context: Context,
    private val preferenceName: String = "secure_pastebin_history_store_v1",
    private val entriesKey: String = "entries",
) : HistoryStore {
    private val sharedPreferences =
        context.getSharedPreferences(preferenceName, Context.MODE_PRIVATE)

    private val lock = Any()

    override suspend fun upsert(entry: HistoryEntry) {
        synchronized(lock) {
            val entries = loadEntries().toMutableList()
            val existingIndex = entries.indexOfFirst { it.id == entry.id }
            if (existingIndex >= 0) {
                entries[existingIndex] = entry
            } else {
                entries.add(entry)
            }
            persistEntries(entries)
        }
    }

    override suspend fun list(): List<HistoryEntry> {
        return synchronized(lock) {
            loadEntries().sortedByDescending { it.createdAtMillis }
        }
    }

    override suspend fun delete(id: String) {
        synchronized(lock) {
            val entries = loadEntries().toMutableList()
            entries.removeAll { it.id == id }
            persistEntries(entries)
        }
    }

    private fun loadEntries(): List<HistoryEntry> {
        val raw = sharedPreferences.getString(entriesKey, null) ?: return emptyList()
        return try {
            val array = JSONArray(raw)
            buildList {
                for (index in 0 until array.length()) {
                    val item = array.optJSONObject(index) ?: continue
                    val id = item.optString("id")
                    val fileName = item.optString("fileName")
                    val createdAtMillis = item.optLong("createdAtMillis")
                    val expiresAtMillis = item.optLong("expiresAtMillis")
                    if (id.isNotBlank() && fileName.isNotBlank()) {
                        add(
                            HistoryEntry(
                                id = id,
                                fileName = fileName,
                                createdAtMillis = createdAtMillis,
                                expiresAtMillis = expiresAtMillis,
                            ),
                        )
                    }
                }
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun persistEntries(entries: List<HistoryEntry>) {
        val array = JSONArray()
        entries.forEach { entry ->
            array.put(
                JSONObject().apply {
                    put("id", entry.id)
                    put("fileName", entry.fileName)
                    put("createdAtMillis", entry.createdAtMillis)
                    put("expiresAtMillis", entry.expiresAtMillis)
                },
            )
        }
        sharedPreferences.edit().putString(entriesKey, array.toString()).apply()
    }
}
