package com.securepastebin.app

import android.content.Context
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextReplacement
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Instrumentation coverage for runtime API settings dialog behavior and persistence.
 */
@RunWith(AndroidJUnit4::class)
class ApiSettingsUiTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    private val appContext = ApplicationProvider.getApplicationContext<Context>()
    private val preferenceName = "secure_pastebin_app_config_v1"
    private val apiBaseKey = "api_base_url"
    private val defaultApiBase = "https://pastebin.sed.fyi"
    private val stagingApiBase = "https://staging.pastebin.sed.fyi"

    @Before
    fun setUp() {
        clearApiBaseConfig()
        composeRule.activityRule.scenario.recreate()
    }

    @After
    fun tearDown() {
        clearApiBaseConfig()
    }

    @Test
    fun apiSettingsDialogRejectsInvalidManualApiBase() {
        composeRule.onNodeWithTag("app-brand-logo").assertIsDisplayed()

        composeRule.onNodeWithTag("api-settings-open-button").performClick()
        composeRule.onNodeWithTag("api-settings-input").performTextReplacement("not-a-url")
        composeRule.onNodeWithTag("api-settings-apply-button").performClick()

        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule
                .onAllNodesWithText("Enter a valid http(s) API base URL.", useUnmergedTree = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
        }

        val defaultHeaderVisible = composeRule
            .onAllNodesWithText("API: $defaultApiBase", useUnmergedTree = true)
            .fetchSemanticsNodes()
            .isNotEmpty()
        assertEquals(true, defaultHeaderVisible)
    }

    @Test
    fun apiSettingsPresetApplyPersistsAcrossActivityRecreation() {
        composeRule.onNodeWithTag("api-settings-open-button").performClick()
        composeRule.onNodeWithTag("api-settings-preset-staging").performClick()
        composeRule.onNodeWithTag("api-settings-apply-button").performClick()

        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule
                .onAllNodesWithText("API: $stagingApiBase", useUnmergedTree = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
        }
        composeRule.onNodeWithText("API: $stagingApiBase").assertIsDisplayed()

        val storedBeforeRecreate = appContext
            .getSharedPreferences(preferenceName, Context.MODE_PRIVATE)
            .getString(apiBaseKey, null)
        assertEquals(stagingApiBase, storedBeforeRecreate)

        composeRule.activityRule.scenario.recreate()

        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule
                .onAllNodesWithText("API: $stagingApiBase", useUnmergedTree = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
        }
        composeRule.onNodeWithText("API: $stagingApiBase").assertIsDisplayed()

        val storedAfterRecreate = appContext
            .getSharedPreferences(preferenceName, Context.MODE_PRIVATE)
            .getString(apiBaseKey, null)
        assertEquals(stagingApiBase, storedAfterRecreate)
    }

    private fun clearApiBaseConfig() {
        appContext
            .getSharedPreferences(preferenceName, Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit()
    }
}
