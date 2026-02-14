package com.securepastebin.core.network

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for HttpApiClient transport defaults and observability headers.
 */
class HttpApiClientTest {
    @Test
    fun `health request sends standard observability headers`() = runBlocking {
        val client = HttpApiClient(
            baseUrl = "http://127.0.0.1:65535",
            clientPlatform = "android",
            clientVersion = "0.1.0-test",
            requestIdProvider = { "request-id-123" },
            defaultHeaders = mapOf("X-Test-Header" to "present"),
        )

        val openConnection = HttpApiClient::class.java.getDeclaredMethod(
            "openConnection",
            String::class.java,
            String::class.java,
        )
        openConnection.isAccessible = true
        val connection = openConnection.invoke(client, "/api/v1/health", "GET") as java.net.HttpURLConnection

        assertEquals("*/*", connection.getRequestProperty("Accept"))
        assertEquals("android", connection.getRequestProperty("X-Client-Platform"))
        assertEquals("0.1.0-test", connection.getRequestProperty("X-Client-Version"))
        assertEquals("request-id-123", connection.getRequestProperty("X-Request-Id"))
        assertEquals("present", connection.getRequestProperty("X-Test-Header"))
        connection.disconnect()
    }

    @Test
    fun `upload multipart body includes binary and filename fields`() = runBlocking {
        val client = HttpApiClient(baseUrl = "http://127.0.0.1:65535")
        val boundary = "SecurePastebinBoundaryUnitTest"
        val payload = byteArrayOf(1, 2, 3, 4, 5)

        val body = client.buildMultipartUploadBody(
            data = payload,
            filename = "encrypted.bin",
            boundary = boundary,
        )

        val bodyText = body.toString(Charsets.UTF_8)
        assertTrue(bodyText.contains("--$boundary"))
        assertTrue(bodyText.contains("name=\"file\"; filename=\"encrypted.bin\""))
        assertTrue(bodyText.contains("name=\"filename\""))
        assertTrue(bodyText.contains("encrypted.bin"))
        assertTrue(bodyText.contains("--$boundary--"))
    }
}
