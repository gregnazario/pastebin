package com.securepastebin.core.storage

import kotlinx.coroutines.runBlocking
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Unit tests for cloud history merge/conflict behavior.
 */
class HistoryCloudSyncCoordinatorTest {
    @Test
    fun syncImportsRemoteEntriesAndPushesMergedSnapshot(): Unit = runBlocking {
        val localStore = FakeHistoryStore(entries = mutableListOf())
        val cloudAdapter = FakeCloudAdapter(
            remoteEntries = mutableListOf(
                HistoryEntry(
                    id = "remote-1",
                    fileName = "remote.txt",
                    createdAtMillis = 200,
                    expiresAtMillis = 900,
                ),
            ),
        )
        val coordinator = HistoryCloudSyncCoordinator(
            historyStore = localStore,
            cloudAdapter = cloudAdapter,
            nowMillis = { 5_000 },
        )

        val result = coordinator.syncNow()

        assertEquals(1, result.stats.added)
        assertEquals(0, result.stats.updated)
        assertEquals(0, result.stats.conflicts)
        assertTrue(result.conflicts.isEmpty())
        assertEquals(1, localStore.list().size)
        assertEquals("remote-1", localStore.list().first().id)
        assertEquals(1, cloudAdapter.lastPushedEntries().size)
    }

    @Test
    fun syncTracksConflictAndPrefersNewerCreatedAt(): Unit = runBlocking {
        val localStore = FakeHistoryStore(
            entries = mutableListOf(
                HistoryEntry(
                    id = "item-1",
                    fileName = "local.txt",
                    createdAtMillis = 100,
                    expiresAtMillis = 800,
                ),
            ),
        )
        val cloudAdapter = FakeCloudAdapter(
            remoteEntries = mutableListOf(
                HistoryEntry(
                    id = "item-1",
                    fileName = "remote.txt",
                    createdAtMillis = 300,
                    expiresAtMillis = 1_200,
                ),
            ),
        )
        val coordinator = HistoryCloudSyncCoordinator(
            historyStore = localStore,
            cloudAdapter = cloudAdapter,
            nowMillis = { 6_000 },
        )

        val result = coordinator.syncNow()
        val localEntries = localStore.list()

        assertEquals(1, result.stats.updated)
        assertEquals(1, result.stats.conflicts)
        assertEquals(1, result.conflicts.size)
        assertEquals(HistorySyncConflictResolution.REMOTE, result.conflicts.first().resolution)
        assertEquals("remote.txt", localEntries.first().fileName)
        assertEquals(300, localEntries.first().createdAtMillis)
    }
}

private class FakeHistoryStore(
    private val entries: MutableList<HistoryEntry>,
) : HistoryStore {
    override suspend fun upsert(entry: HistoryEntry) {
        entries.removeAll { it.id == entry.id }
        entries.add(entry)
    }

    override suspend fun list(): List<HistoryEntry> {
        return entries.toList()
    }

    override suspend fun delete(id: String) {
        entries.removeAll { it.id == id }
    }
}

private class FakeCloudAdapter(
    private val remoteEntries: MutableList<HistoryEntry>,
) : HistoryCloudSyncAdapter {
    private val pushedSnapshots = mutableListOf<List<HistoryEntry>>()

    override suspend fun fetchRemoteEntries(): List<HistoryEntry> {
        return remoteEntries.toList()
    }

    override suspend fun pushRemoteEntries(entries: List<HistoryEntry>) {
        remoteEntries.clear()
        remoteEntries.addAll(entries)
        pushedSnapshots.add(entries)
    }

    fun lastPushedEntries(): List<HistoryEntry> {
        return pushedSnapshots.lastOrNull() ?: emptyList()
    }
}
