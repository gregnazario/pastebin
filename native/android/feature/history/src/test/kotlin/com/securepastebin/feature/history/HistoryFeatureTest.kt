package com.securepastebin.feature.history

import com.securepastebin.core.storage.HistoryEntry
import com.securepastebin.core.storage.HistoryStore
import kotlinx.coroutines.runBlocking
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * History feature tests for filter/sort/delete behavior.
 */
class HistoryFeatureTest {
    @Test
    fun listExcludesExpiredWhenDisabled(): Unit = runBlocking {
        val fakeStore = FakeHistoryStore(
            entries = mutableListOf(
                HistoryEntry(id = "a", fileName = "alpha.txt", createdAtMillis = 200, expiresAtMillis = 900),
                HistoryEntry(id = "b", fileName = "beta.txt", createdAtMillis = 100, expiresAtMillis = 0),
                HistoryEntry(id = "c", fileName = "gamma.txt", createdAtMillis = 300, expiresAtMillis = 400),
            ),
        )
        val feature = HistoryFeature(historyStore = fakeStore, nowMillis = { 500 })

        val items = feature.list(includeExpired = false)

        assertEquals(listOf("a", "b"), items.map { it.id })
        assertTrue(items.all { !it.isExpired })
    }

    @Test
    fun listIncludesExpiredWhenEnabled(): Unit = runBlocking {
        val fakeStore = FakeHistoryStore(
            entries = mutableListOf(
                HistoryEntry(id = "a", fileName = "alpha.txt", createdAtMillis = 200, expiresAtMillis = 900),
                HistoryEntry(id = "b", fileName = "beta.txt", createdAtMillis = 100, expiresAtMillis = 0),
                HistoryEntry(id = "c", fileName = "gamma.txt", createdAtMillis = 300, expiresAtMillis = 400),
            ),
        )
        val feature = HistoryFeature(historyStore = fakeStore, nowMillis = { 500 })

        val items = feature.list(includeExpired = true)

        assertEquals(listOf("c", "a", "b"), items.map { it.id })
        assertEquals(true, items.first { it.id == "c" }.isExpired)
    }

    @Test
    fun deleteRemovesEntryFromStore(): Unit = runBlocking {
        val fakeStore = FakeHistoryStore(
            entries = mutableListOf(
                HistoryEntry(id = "a", fileName = "alpha.txt", createdAtMillis = 200, expiresAtMillis = 0),
                HistoryEntry(id = "b", fileName = "beta.txt", createdAtMillis = 100, expiresAtMillis = 0),
            ),
        )
        val feature = HistoryFeature(historyStore = fakeStore, nowMillis = { 1000 })

        feature.delete("a")
        val items = feature.list(includeExpired = true)

        assertEquals(listOf("b"), items.map { it.id })
    }

    @Test
    fun listIncludesShareUrlsWhenConfigured(): Unit = runBlocking {
        val fakeStore = FakeHistoryStore(
            entries = mutableListOf(
                HistoryEntry(id = "file abc", fileName = "alpha.txt", createdAtMillis = 200, expiresAtMillis = 0),
            ),
        )
        val feature = HistoryFeature(
            historyStore = fakeStore,
            shareBaseUrl = "https://pastebin.sed.fyi/",
            nowMillis = { 1000 },
        )

        val items = feature.list(includeExpired = true)

        assertEquals(1, items.size)
        assertEquals("https://pastebin.sed.fyi/p/file%20abc", items.first().shareUrl)
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
