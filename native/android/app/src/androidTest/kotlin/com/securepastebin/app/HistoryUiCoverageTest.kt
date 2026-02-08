package com.securepastebin.app

import android.content.Context
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
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

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
    private val includeExpiredSwitchTag = "history-include-expired-switch"

    @After
    fun tearDown() {
        clearHistoryStore()
        clearCloudSyncConfig()
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
}
