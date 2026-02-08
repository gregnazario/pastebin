package com.securepastebin.app

import android.content.Context
import android.net.Uri
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.securepastebin.core.storage.HistoryEntry
import com.securepastebin.core.storage.SharedPreferencesHistoryStore
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

/**
 * Additional instrumentation coverage for History tab controls and states.
 */
@RunWith(AndroidJUnit4::class)
class HistoryUiCoverageTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    private val appContext = ApplicationProvider.getApplicationContext<Context>()
    private val historyStore = SharedPreferencesHistoryStore(appContext)
    private val historyPreferenceName = "secure_pastebin_history_store_v1"
    private val cloudSyncPreferenceName = "secure_pastebin_cloud_sync_v1"
    private val cloudSyncDocumentURIKey = "google_drive_sync_document_uri"
    private val driveSyncFixtureFileName = "android-test-drive-sync.json"
    private val includeExpiredSwitchTag = "history-include-expired-switch"

    @After
    fun tearDown() {
        clearHistoryStore()
        clearCloudSyncConfig()
        deleteDriveSyncFixtureFile()
    }

    @Test
    fun historyDeleteActionRemovesVisibleEntry() {
        clearHistoryStore()
        runBlocking {
            historyStore.upsert(
                HistoryEntry(
                    id = "delete-target",
                    fileName = "delete-me.txt",
                    createdAtMillis = System.currentTimeMillis(),
                    expiresAtMillis = System.currentTimeMillis() + 600_000,
                ),
            )
        }

        composeRule.onNodeWithText("History").performClick()
        composeRule.onNodeWithText("Refresh").performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule
                .onAllNodesWithText("Delete", useUnmergedTree = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
        }

        composeRule.onNodeWithText("Delete", useUnmergedTree = true).performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule
                .onAllNodesWithText("No history entries yet.", useUnmergedTree = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
        }
        composeRule.onNodeWithText("No history entries yet.").assertIsDisplayed()
    }

    @Test
    fun historyIncludeExpiredSwitchRevealsExpiredEntries() {
        clearHistoryStore()
        val now = System.currentTimeMillis()
        runBlocking {
            historyStore.upsert(
                HistoryEntry(
                    id = "active-entry",
                    fileName = "active-note.txt",
                    createdAtMillis = now,
                    expiresAtMillis = now + 600_000,
                ),
            )
            historyStore.upsert(
                HistoryEntry(
                    id = "expired-entry",
                    fileName = "expired-note.txt",
                    createdAtMillis = now - 100_000,
                    expiresAtMillis = now - 10_000,
                ),
            )
        }

        composeRule.onNodeWithText("History").performClick()
        composeRule.onNodeWithText("Refresh").performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule
                .onAllNodesWithText("active-note.txt", useUnmergedTree = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
        }

        val expiredVisibleBeforeToggle = composeRule
            .onAllNodesWithText("expired-note.txt", useUnmergedTree = true)
            .fetchSemanticsNodes()
            .isNotEmpty()
        assertFalse(
            "Expired entries should be hidden before enabling Include expired.",
            expiredVisibleBeforeToggle,
        )

        composeRule.onNodeWithTag(includeExpiredSwitchTag, useUnmergedTree = true).performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule
                .onAllNodesWithText("expired-note.txt", useUnmergedTree = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
        }
        composeRule.onNodeWithText("expired-note.txt").assertIsDisplayed()
    }

    @Test
    fun historyCloudSyncSectionShowsDriveSetupControlsWhenUnconfigured() {
        clearCloudSyncConfig()

        composeRule.onNodeWithText("History").performClick()

        composeRule.onNodeWithText("Cloud Sync").assertIsDisplayed()
        composeRule.onNodeWithText("Google Drive sync file is not configured yet.").assertIsDisplayed()
        composeRule.onNodeWithText("Create Drive File").assertIsDisplayed()
        composeRule.onNodeWithText("Use Existing File").assertIsDisplayed()
    }

    @Test
    fun historyCloudSyncConfiguredSyncNowShowsSuccessSummaryAndImportedEntry() {
        clearHistoryStore()
        val now = System.currentTimeMillis()
        configureDriveSyncFixture(
            remoteEntries = listOf(
                HistoryEntry(
                    id = "remote-1",
                    fileName = "remote-note.txt",
                    createdAtMillis = now,
                    expiresAtMillis = now + 600_000,
                ),
            ),
        )

        composeRule.onNodeWithText("History").performClick()
        composeRule.onNodeWithText("Sync Now").assertIsDisplayed()
        composeRule.onNodeWithText("Change File").assertIsDisplayed()

        composeRule.onNodeWithText("Sync Now").performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule
                .onAllNodesWithText("Synced: 1 added, 0 updated, 0 conflicts.", useUnmergedTree = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
        }

        composeRule.onNodeWithText("Synced: 1 added, 0 updated, 0 conflicts.").assertIsDisplayed()
        composeRule.onNodeWithText("remote-note.txt").assertIsDisplayed()
    }

    @Test
    fun historyCloudSyncConfiguredConflictShowsConflictSummaryAndRemoteWinner() {
        clearHistoryStore()
        val now = System.currentTimeMillis()
        runBlocking {
            historyStore.upsert(
                HistoryEntry(
                    id = "conflict-id",
                    fileName = "local-conflict.txt",
                    createdAtMillis = now,
                    expiresAtMillis = now + 600_000,
                ),
            )
        }
        configureDriveSyncFixture(
            remoteEntries = listOf(
                HistoryEntry(
                    id = "conflict-id",
                    fileName = "remote-conflict.txt",
                    createdAtMillis = now + 1_000,
                    expiresAtMillis = now + 600_000,
                ),
            ),
        )

        composeRule.onNodeWithText("History").performClick()
        composeRule.onNodeWithText("Sync Now").performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule
                .onAllNodesWithText("Synced: 0 added, 1 updated, 1 conflicts.", useUnmergedTree = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
        }

        composeRule.onNodeWithText("Synced: 0 added, 1 updated, 1 conflicts.").assertIsDisplayed()
        composeRule.onNodeWithText("remote-conflict.txt").assertIsDisplayed()
        val localEntryStillVisible = composeRule
            .onAllNodesWithText("local-conflict.txt", useUnmergedTree = true)
            .fetchSemanticsNodes()
            .isNotEmpty()
        assertFalse("Local conflict entry should be replaced by remote winner.", localEntryStillVisible)
    }

    private fun clearHistoryStore() {
        appContext
            .getSharedPreferences(historyPreferenceName, Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit()
    }

    private fun clearCloudSyncConfig() {
        appContext
            .getSharedPreferences(cloudSyncPreferenceName, Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit()
    }

    /**
     * Seeds a local sync payload file and stores its URI in cloud-sync preferences.
     */
    private fun configureDriveSyncFixture(remoteEntries: List<HistoryEntry>) {
        val fixtureUri = writeDriveSyncFixture(remoteEntries)
        appContext
            .getSharedPreferences(cloudSyncPreferenceName, Context.MODE_PRIVATE)
            .edit()
            .putString(cloudSyncDocumentURIKey, fixtureUri.toString())
            .commit()
        composeRule.activityRule.scenario.recreate()
    }

    /**
     * Writes a v1 cloud-sync payload fixture used by instrumentation tests.
     */
    private fun writeDriveSyncFixture(remoteEntries: List<HistoryEntry>): Uri {
        val payload = JSONObject().apply {
            put("version", 1)
            put("exportedAtMillis", System.currentTimeMillis())
            put(
                "entries",
                JSONArray().apply {
                    remoteEntries.forEach { entry ->
                        put(
                            JSONObject().apply {
                                put("id", entry.id)
                                put("fileName", entry.fileName)
                                put("createdAtMillis", entry.createdAtMillis)
                                put("expiresAtMillis", entry.expiresAtMillis)
                            },
                        )
                    }
                },
            )
        }
        val fixtureFile = File(appContext.filesDir, driveSyncFixtureFileName)
        fixtureFile.writeText(payload.toString())
        return Uri.fromFile(fixtureFile)
    }

    /**
     * Deletes the instrumentation fixture file used for configured cloud-sync tests.
     */
    private fun deleteDriveSyncFixtureFile() {
        File(appContext.filesDir, driveSyncFixtureFileName).delete()
    }
}
