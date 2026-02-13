package com.securepastebin.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for runtime API settings normalization, validation, and preset matching.
 */
class ApiBaseSettingsTest {
    @Test
    fun normalizeApiBaseUrlCandidateTrimsAndRemovesTrailingSlash() {
        assertEquals(
            "https://staging.pastebin.sed.fyi",
            normalizeApiBaseUrlCandidate("  https://staging.pastebin.sed.fyi/  "),
        )
    }

    @Test
    fun isValidApiBaseUrlAcceptsHttpAndHttpsHosts() {
        assertTrue(isValidApiBaseUrl("http://10.0.2.2:3000"))
        assertTrue(isValidApiBaseUrl("https://pastebin.sed.fyi"))
    }

    @Test
    fun isValidApiBaseUrlRejectsMissingSchemeOrHost() {
        assertFalse(isValidApiBaseUrl("pastebin.sed.fyi"))
        assertFalse(isValidApiBaseUrl("https:///"))
        assertFalse(isValidApiBaseUrl("ftp://pastebin.sed.fyi"))
    }

    @Test
    fun presetMatchingFindsPresetForNormalizedValue() {
        assertEquals(
            ApiBaseEnvironmentPreset.STAGING,
            ApiBaseEnvironmentPreset.matching("https://staging.pastebin.sed.fyi/"),
        )
        assertEquals(
            ApiBaseEnvironmentPreset.LOCAL,
            ApiBaseEnvironmentPreset.matching("http://10.0.2.2:3000"),
        )
    }
}
