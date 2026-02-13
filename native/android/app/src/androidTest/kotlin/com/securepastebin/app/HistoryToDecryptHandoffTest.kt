package com.securepastebin.app

import android.content.Context
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.securepastebin.core.storage.HistoryEntry
import com.securepastebin.core.storage.SharedPreferencesHistoryStore
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Instrumentation coverage for the in-app history-to-decrypt handoff behavior.
 */
@RunWith(AndroidJUnit4::class)
class HistoryToDecryptHandoffTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    private val appContext = ApplicationProvider.getApplicationContext<Context>()
    private val historyStore = SharedPreferencesHistoryStore(appContext)
    private val preferenceName = "secure_pastebin_history_store_v1"

    @Before
    fun setUp() {
        clearHistoryStore()
    }

    @After
    fun tearDown() {
        clearHistoryStore()
    }

    @Test
    fun historyOpenActionSwitchesToDecryptAndPrefillsShareUrl() {
        val entryID = "ui-handoff-entry"
        val expectedShareURL = "https://pastebin.sed.fyi/p/$entryID"
        runBlocking {
            historyStore.upsert(
                HistoryEntry(
                    id = entryID,
                    fileName = "handoff.txt",
                    createdAtMillis = System.currentTimeMillis(),
                    expiresAtMillis = System.currentTimeMillis() + 600_000,
                ),
            )
        }

        composeRule.onNodeWithText("History").performClick()
        composeRule.onNodeWithText("Refresh").performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule
                .onAllNodesWithText("Open", useUnmergedTree = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
        }

        composeRule.onNodeWithText("Open", useUnmergedTree = true).performClick()

        composeRule.onNodeWithText("Download and Decrypt").assertIsDisplayed()
        composeRule.onNodeWithText("Share URL").assertIsDisplayed()
        composeRule.onNodeWithText(expectedShareURL, substring = true).assertIsDisplayed()
    }

    private fun clearHistoryStore() {
        appContext
            .getSharedPreferences(preferenceName, Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit()
    }
}
