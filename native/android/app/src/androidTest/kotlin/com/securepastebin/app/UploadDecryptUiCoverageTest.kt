package com.securepastebin.app

import android.app.Activity
import android.app.Instrumentation
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.performTextReplacement
import androidx.test.core.app.ApplicationProvider
import androidx.test.espresso.intent.Intents
import androidx.test.espresso.intent.matcher.IntentMatchers.hasAction
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Before
import org.junit.Assert.assertFalse
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

/**
 * Instrumentation coverage for upload/decrypt edge handling and recreation behavior.
 */
@RunWith(AndroidJUnit4::class)
class UploadDecryptUiCoverageTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    private val appContext = ApplicationProvider.getApplicationContext<Context>()
    private val cloudSyncPreferenceName = "secure_pastebin_cloud_sync_v1"
    private val cloudSyncDocumentURIKey = "google_drive_sync_document_uri"
    private val trackedDriveSyncFixtures = mutableSetOf<File>()

    @Before
    fun setUp() {
        clearCloudSyncConfig()
    }

    @After
    fun tearDown() {
        clearCloudSyncConfig()
        deleteDriveSyncFixtureFiles()
    }

    @Test
    fun uploadFileModeWithoutSelectionKeepsSubmitDisabled() {
        composeRule.onNodeWithText("File").performClick()
        composeRule.onNodeWithTag(uploadPasswordInputTag).performTextInput("StrongPass#2026")

        composeRule.onNodeWithTag(uploadSubmitButtonTag).assertIsNotEnabled()
    }

    @Test
    fun uploadFilePickerCancelKeepsSubmitDisabledAndSelectionEmpty() {
        withIntentStubs {
            Intents.intending(hasAction(Intent.ACTION_OPEN_DOCUMENT))
                .respondWith(Instrumentation.ActivityResult(Activity.RESULT_CANCELED, null))

            composeRule.onNodeWithText("File").performClick()
            composeRule.onNodeWithTag(uploadPasswordInputTag).performTextInput("StrongPass#2026")
            composeRule.onNodeWithTag(uploadChooseFileButtonTag).performClick()
            composeRule.waitForIdle()

            composeRule.onNodeWithTag(uploadSubmitButtonTag).assertIsNotEnabled()
            val selectedLabelPresent = composeRule
                .onAllNodesWithText("Selected:", substring = true, useUnmergedTree = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
            assertFalse(selectedLabelPresent)
        }
    }

    @Test
    fun uploadFilePickerInvalidUriKeepsSubmitDisabled() {
        withIntentStubs {
            val invalidUri = Uri.parse("content://com.example.invalid.documents/file.bin")
            val resultIntent = Intent().setData(invalidUri)
            Intents.intending(hasAction(Intent.ACTION_OPEN_DOCUMENT))
                .respondWith(Instrumentation.ActivityResult(Activity.RESULT_OK, resultIntent))

            composeRule.onNodeWithText("File").performClick()
            composeRule.onNodeWithTag(uploadPasswordInputTag).performTextInput("StrongPass#2026")
            composeRule.onNodeWithTag(uploadChooseFileButtonTag).performClick()
            composeRule.waitForIdle()

            composeRule.onNodeWithTag(uploadSubmitButtonTag).assertIsNotEnabled()
            val selectedLabelPresent = composeRule
                .onAllNodesWithText("Selected:", substring = true, useUnmergedTree = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
            assertFalse(selectedLabelPresent)
        }
    }

    @Test
    fun uploadDraftInputsClearAfterActivityRecreation() {
        composeRule.onNodeWithTag(uploadNoteInputTag).performTextInput("ephemeral note body")
        composeRule.onNodeWithTag(uploadPasswordInputTag).performTextInput("StrongPass#2026")
        composeRule.onNodeWithTag(uploadSubmitButtonTag).assertIsEnabled()

        composeRule.activityRule.scenario.recreate()

        composeRule.onNodeWithTag(uploadSubmitButtonTag).assertIsNotEnabled()
    }

    @Test
    fun decryptDraftInputsClearAfterActivityRecreation() {
        composeRule.onNodeWithText("Decrypt").performClick()
        composeRule.onNodeWithTag(decryptShareURLInputTag)
            .performTextReplacement("https://pastebin.sed.fyi/p/file-abc#fragment")
        composeRule.onNodeWithTag(decryptPasswordInputTag).performTextInput("StrongPass#2026")
        composeRule.onNodeWithTag(decryptSubmitButtonTag).assertIsEnabled()

        composeRule.activityRule.scenario.recreate()
        composeRule.onNodeWithText("Decrypt").performClick()

        composeRule.onNodeWithTag(decryptSubmitButtonTag).assertIsNotEnabled()
    }

    @Test
    fun decryptMalformedShareUrlShowsValidationError() {
        composeRule.onNodeWithText("Decrypt").performClick()
        composeRule.onNodeWithTag(decryptShareURLInputTag)
            .performTextReplacement("https://pastebin.sed.fyi/p/file abc#key")
        composeRule.onNodeWithTag(decryptPasswordInputTag).performTextInput("StrongPass#2026")
        composeRule.onNodeWithTag(decryptSubmitButtonTag).performClick()

        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule
                .onAllNodesWithText("Error: Share URL is invalid.", useUnmergedTree = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
        }
        composeRule.onNodeWithText("Error: Share URL is invalid.").assertIsDisplayed()
    }

    @Test
    fun decryptMissingKeyFragmentShowsValidationError() {
        composeRule.onNodeWithText("Decrypt").performClick()
        composeRule.onNodeWithTag(decryptShareURLInputTag)
            .performTextReplacement("https://pastebin.sed.fyi/p/file-abc")
        composeRule.onNodeWithTag(decryptPasswordInputTag).performTextInput("StrongPass#2026")
        composeRule.onNodeWithTag(decryptSubmitButtonTag).performClick()

        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule
                .onAllNodesWithText(
                    "Error: Share URL does not include a private key fragment.",
                    useUnmergedTree = true,
                )
                .fetchSemanticsNodes()
                .isNotEmpty()
        }
        composeRule
            .onNodeWithText("Error: Share URL does not include a private key fragment.")
            .assertIsDisplayed()
    }

    @Test
    fun historyCloudSyncConfigurationPersistsAfterActivityRecreation() {
        configureDriveSyncFixture(fixtureFileName = "drive-sync-recreate.json")

        composeRule.onNodeWithText("History").performClick()
        composeRule.onNodeWithText("Sync Now").assertIsDisplayed()
        composeRule.onNodeWithText("Change File").assertIsDisplayed()

        composeRule.activityRule.scenario.recreate()

        composeRule.onNodeWithText("History").performClick()
        composeRule.onNodeWithText("Sync Now").assertIsDisplayed()
        composeRule.onNodeWithText("Change File").assertIsDisplayed()
    }

    private fun clearCloudSyncConfig() {
        appContext
            .getSharedPreferences(cloudSyncPreferenceName, Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit()
    }

    private fun configureDriveSyncFixture(fixtureFileName: String) {
        val payload = JSONObject().apply {
            put("version", 1)
            put("exportedAtMillis", System.currentTimeMillis())
            put("entries", JSONArray())
        }
        val fixtureFile = File(appContext.filesDir, fixtureFileName)
        fixtureFile.writeText(payload.toString())
        trackedDriveSyncFixtures += fixtureFile

        appContext
            .getSharedPreferences(cloudSyncPreferenceName, Context.MODE_PRIVATE)
            .edit()
            .putString(cloudSyncDocumentURIKey, Uri.fromFile(fixtureFile).toString())
            .commit()
        composeRule.activityRule.scenario.recreate()
    }

    private fun deleteDriveSyncFixtureFiles() {
        trackedDriveSyncFixtures.forEach { fixture ->
            fixture.delete()
        }
        trackedDriveSyncFixtures.clear()
    }

    private fun withIntentStubs(block: () -> Unit) {
        Intents.init()
        try {
            block()
        } finally {
            Intents.release()
        }
    }

    companion object {
        private const val uploadNoteInputTag = "upload-note-input"
        private const val uploadPasswordInputTag = "upload-password-input"
        private const val uploadSubmitButtonTag = "upload-submit-button"
        private const val uploadChooseFileButtonTag = "upload-choose-file-button"
        private const val decryptShareURLInputTag = "decrypt-share-url-input"
        private const val decryptPasswordInputTag = "decrypt-password-input"
        private const val decryptSubmitButtonTag = "decrypt-submit-button"
    }
}
