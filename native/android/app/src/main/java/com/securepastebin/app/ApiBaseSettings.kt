package com.securepastebin.app

import android.content.Context
import java.net.URI

/**
 * Preset API environments available from Android runtime settings UI.
 */
enum class ApiBaseEnvironmentPreset(
    val label: String,
    val baseUrl: String,
) {
    LOCAL("Local", "http://10.0.2.2:3000"),
    STAGING("Staging", "https://staging.pastebin.sed.fyi"),
    PRODUCTION("Production", "https://pastebin.sed.fyi");

    companion object {
        fun matching(baseUrl: String): ApiBaseEnvironmentPreset? {
            val normalized = normalizeApiBaseUrlCandidate(baseUrl)
            return entries.firstOrNull { preset ->
                normalizeApiBaseUrlCandidate(preset.baseUrl) == normalized
            }
        }
    }
}

/**
 * Persists runtime-selected API base URL for Android app sessions.
 */
class ApiBaseConfigurationStore(
    context: Context,
    private val preferenceName: String = "secure_pastebin_app_config_v1",
    private val apiBaseKey: String = "api_base_url",
) {
    private val sharedPreferences =
        context.getSharedPreferences(preferenceName, Context.MODE_PRIVATE)

    fun readApiBaseUrl(defaultValue: String): String {
        val defaultNormalized = normalizeApiBaseUrlCandidate(defaultValue)
        val stored = sharedPreferences.getString(apiBaseKey, null) ?: return defaultNormalized
        val normalized = normalizeApiBaseUrlCandidate(stored)
        return if (isValidApiBaseUrl(normalized)) {
            normalized
        } else {
            defaultNormalized
        }
    }

    fun writeApiBaseUrl(baseUrl: String) {
        val normalized = normalizeApiBaseUrlCandidate(baseUrl)
        require(isValidApiBaseUrl(normalized)) { "Invalid API base URL." }
        sharedPreferences.edit().putString(apiBaseKey, normalized).apply()
    }
}

/**
 * Normalizes a user-provided API base URL for storage and comparisons.
 */
internal fun normalizeApiBaseUrlCandidate(rawValue: String): String {
    val trimmed = rawValue.trim()
    val uri = runCatching { URI(trimmed) }.getOrNull() ?: return trimmed.trimEnd('/')
    val scheme = uri.scheme?.lowercase() ?: return trimmed.trimEnd('/')
    val host = uri.host ?: return trimmed.trimEnd('/')
    val path = uri.path
    val hasUnsupportedPath = !path.isNullOrBlank() && path != "/"
    if (hasUnsupportedPath || uri.query != null || uri.fragment != null || uri.userInfo != null) {
        return trimmed.trimEnd('/')
    }

    return URI(scheme, null, host.lowercase(), uri.port, null, null, null)
        .toString()
        .trimEnd('/')
}

/**
 * Validates API base URL structure for runtime environment settings.
 */
internal fun isValidApiBaseUrl(candidate: String): Boolean {
    val trimmed = candidate.trim()
    if (trimmed.isBlank()) {
        return false
    }

    val uri = runCatching { URI(trimmed) }.getOrNull() ?: return false
    val scheme = uri.scheme?.lowercase() ?: return false
    if (scheme != "http" && scheme != "https") {
        return false
    }

    val hasUnsupportedPath = !uri.path.isNullOrBlank() && uri.path != "/"
    if (hasUnsupportedPath) return false
    if (uri.query != null || uri.fragment != null || uri.userInfo != null) return false

    return !uri.host.isNullOrBlank()
}
