package com.securepastebin.core.storage

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject

/**
 * Conflict winner when local and remote entries differ for one ID.
 */
enum class HistorySyncConflictResolution {
    LOCAL,
    REMOTE,
}

/**
 * One conflict resolution record for cloud merge operations.
 */
data class HistorySyncConflict(
    val id: String,
    val resolution: HistorySyncConflictResolution,
    val localCreatedAtMillis: Long,
    val remoteCreatedAtMillis: Long,
)

/**
 * Aggregate sync counters for one sync execution.
 */
data class HistorySyncStats(
    val added: Int,
    val updated: Int,
    val unchanged: Int,
    val conflicts: Int,
)

/**
 * Cloud sync result returned by the coordinator.
 */
data class HistorySyncResult(
    val stats: HistorySyncStats,
    val conflicts: List<HistorySyncConflict>,
    val syncedAtMillis: Long,
)

/**
 * Cloud adapter contract for loading and persisting history snapshots.
 */
interface HistoryCloudSyncAdapter {
    suspend fun fetchRemoteEntries(): List<HistoryEntry>
    suspend fun pushRemoteEntries(entries: List<HistoryEntry>)
}

/**
 * Google Drive document-based cloud adapter using Storage Access Framework URIs.
 */
class GoogleDriveHistorySyncAdapter(
    private val context: Context,
    private val documentUri: Uri,
    private val nowMillis: () -> Long = { System.currentTimeMillis() },
) : HistoryCloudSyncAdapter {
    override suspend fun fetchRemoteEntries(): List<HistoryEntry> {
        val raw = context.contentResolver.openInputStream(documentUri)?.use { input ->
            input.readBytes().toString(Charsets.UTF_8)
        } ?: return emptyList()

        if (raw.isBlank()) {
            return emptyList()
        }

        return parseEntries(raw)
    }

    override suspend fun pushRemoteEntries(entries: List<HistoryEntry>) {
        val payload = JSONObject().apply {
            put("version", 1)
            put("exportedAtMillis", nowMillis())
            put("entries", entriesToJSONArray(entries))
        }

        context.contentResolver.openOutputStream(documentUri, "wt")?.use { output ->
            output.write(payload.toString().toByteArray(Charsets.UTF_8))
        } ?: throw IllegalStateException("Unable to open Google Drive sync file for writing.")
    }

    private fun parseEntries(raw: String): List<HistoryEntry> {
        return runCatching {
            val trimmed = raw.trim()
            if (trimmed.startsWith("[")) {
                parseEntriesArray(JSONArray(trimmed))
            } else {
                val payload = JSONObject(trimmed)
                val version = payload.optInt("version", 0)
                require(version == 1) { "Unsupported cloud sync payload version: $version" }
                parseEntriesArray(payload.optJSONArray("entries") ?: JSONArray())
            }
        }.getOrElse { throwable ->
            throw IllegalStateException("Unable to parse Google Drive sync payload.", throwable)
        }
    }

    private fun parseEntriesArray(array: JSONArray): List<HistoryEntry> {
        return buildList {
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                val id = item.optString("id")
                val fileName = item.optString("fileName")
                val createdAtMillis = item.optLong("createdAtMillis")
                val expiresAtMillis = item.optLong("expiresAtMillis")
                if (id.isBlank() || fileName.isBlank()) {
                    continue
                }
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

    private fun entriesToJSONArray(entries: List<HistoryEntry>): JSONArray {
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
        return array
    }
}

/**
 * One-shot history cloud sync coordinator with conflict-aware merge tracking.
 */
class HistoryCloudSyncCoordinator(
    private val historyStore: HistoryStore,
    private val cloudAdapter: HistoryCloudSyncAdapter,
    private val nowMillis: () -> Long = { System.currentTimeMillis() },
) {
    suspend fun syncNow(): HistorySyncResult {
        val localEntries = historyStore.list()
        val remoteEntries = cloudAdapter.fetchRemoteEntries()
        val merge = mergeEntries(local = localEntries, remote = remoteEntries)

        val localIDs = localEntries.map { it.id }.toSet()
        val mergedIDs = merge.entries.map { it.id }.toSet()
        localIDs.subtract(mergedIDs).forEach { removedID ->
            historyStore.delete(removedID)
        }
        merge.entries.forEach { historyStore.upsert(it) }
        cloudAdapter.pushRemoteEntries(merge.entries)

        return HistorySyncResult(
            stats = merge.stats,
            conflicts = merge.conflicts,
            syncedAtMillis = nowMillis(),
        )
    }

    private data class MergeAccumulator(
        val entries: List<HistoryEntry>,
        val stats: HistorySyncStats,
        val conflicts: List<HistorySyncConflict>,
    )

    private fun mergeEntries(
        local: List<HistoryEntry>,
        remote: List<HistoryEntry>,
    ): MergeAccumulator {
        val localMap = local.associateBy { it.id }
        val remoteMap = remote.associateBy { it.id }
        val allIDs = localMap.keys + remoteMap.keys

        val merged = mutableListOf<HistoryEntry>()
        val conflicts = mutableListOf<HistorySyncConflict>()
        var added = 0
        var updated = 0
        var unchanged = 0
        var conflictCount = 0

        allIDs.forEach { id ->
            val localEntry = localMap[id]
            val remoteEntry = remoteMap[id]

            when {
                localEntry != null && remoteEntry == null -> {
                    merged += localEntry
                    added += 1
                }
                localEntry == null && remoteEntry != null -> {
                    merged += remoteEntry
                    added += 1
                }
                localEntry != null && remoteEntry != null -> {
                    if (localEntry == remoteEntry) {
                        merged += localEntry
                        unchanged += 1
                    } else {
                        val resolution: HistorySyncConflictResolution
                        val winner: HistoryEntry
                        if (localEntry.createdAtMillis >= remoteEntry.createdAtMillis) {
                            resolution = HistorySyncConflictResolution.LOCAL
                            winner = localEntry
                        } else {
                            resolution = HistorySyncConflictResolution.REMOTE
                            winner = remoteEntry
                        }

                        merged += winner
                        conflicts += HistorySyncConflict(
                            id = id,
                            resolution = resolution,
                            localCreatedAtMillis = localEntry.createdAtMillis,
                            remoteCreatedAtMillis = remoteEntry.createdAtMillis,
                        )
                        updated += 1
                        conflictCount += 1
                    }
                }
            }
        }

        return MergeAccumulator(
            entries = merged.sortedByDescending { it.createdAtMillis },
            stats = HistorySyncStats(
                added = added,
                updated = updated,
                unchanged = unchanged,
                conflicts = conflictCount,
            ),
            conflicts = conflicts,
        )
    }
}

/**
 * Utility to persist and restore cloud sync URI selections.
 */
class GoogleDriveSyncConfigurationStore(
    context: Context,
    private val preferenceName: String = "secure_pastebin_cloud_sync_v1",
    private val documentURIKey: String = "google_drive_sync_document_uri",
) {
    private val sharedPreferences =
        context.getSharedPreferences(preferenceName, Context.MODE_PRIVATE)

    fun readDocumentURI(): String? {
        return sharedPreferences.getString(documentURIKey, null)
    }

    fun writeDocumentURI(uri: Uri) {
        sharedPreferences.edit().putString(documentURIKey, uri.toString()).apply()
    }

    fun clear() {
        sharedPreferences.edit().remove(documentURIKey).apply()
    }

    fun takePersistablePermissions(
        contentResolver: ContentResolver,
        uri: Uri,
    ) {
        runCatching {
            contentResolver.takePersistableUriPermission(
                uri,
                android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION or
                    android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
            )
        }
    }
}
