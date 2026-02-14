package com.securepastebin.core.network

import org.json.JSONObject
import java.io.BufferedReader
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.UUID

/**
 * API contract and implementation for native Android calls to Secure Pastebin API v1.
 */
interface ApiClient {
    suspend fun uploadEncryptedBlob(data: ByteArray, filename: String): UploadResponse
    suspend fun downloadEncryptedBlob(id: String): DownloadResponse
    suspend fun health(): HealthResponse
}

data class UploadResponse(val id: String, val expiresAt: Long)
data class DownloadResponse(val data: ByteArray)
data class HealthResponse(val configured: Boolean, val account: String?)

/**
 * API error model for transport, protocol, and server failures.
 */
sealed class ApiClientException(message: String) : Exception(message) {
    class Network(message: String) : ApiClientException(message)
    class Protocol(message: String) : ApiClientException(message)
    class Server(val statusCode: Int, message: String) : ApiClientException(message)
}

/**
 * HttpURLConnection-based implementation of the native API v1 client.
 */
class HttpApiClient(
    private val baseUrl: String,
    private val connectTimeoutMs: Int = 30_000,
    private val readTimeoutMs: Int = 30_000,
    private val clientPlatform: String = "android",
    private val clientVersion: String = "unknown",
    private val requestIdProvider: () -> String = { UUID.randomUUID().toString() },
    private val defaultHeaders: Map<String, String> = emptyMap(),
) : ApiClient {
    override suspend fun uploadEncryptedBlob(data: ByteArray, filename: String): UploadResponse {
        val boundary = "SecurePastebinBoundary${UUID.randomUUID().toString().replace("-", "")}"
        val multipartBody = buildMultipartUploadBody(
            data = data,
            filename = filename,
            boundary = boundary,
        )

        val json = requestJson(
            method = "POST",
            path = "/api/v1/upload",
            bodyBytes = multipartBody,
            contentType = "multipart/form-data; boundary=$boundary",
        )

        return UploadResponse(
            id = json.getString("id"),
            expiresAt = json.getLong("expiresAt"),
        )
    }

    override suspend fun downloadEncryptedBlob(id: String): DownloadResponse {
        val encodedId = URLEncoder.encode(id, Charsets.UTF_8.name())
        val json = requestJson(
            method = "GET",
            path = "/api/v1/download?id=$encodedId",
            body = null,
        )

        val raw = json.getJSONArray("data")
        val bytes = ByteArray(raw.length())
        for (index in 0 until raw.length()) {
            bytes[index] = raw.getInt(index).toByte()
        }

        return DownloadResponse(data = bytes)
    }

    override suspend fun health(): HealthResponse {
        val json = requestJson(
            method = "GET",
            path = "/api/v1/health",
            body = null,
        )

        return HealthResponse(
            configured = json.getBoolean("configured"),
            account = if (json.isNull("account")) null else json.getString("account"),
        )
    }

    private fun requestJson(method: String, path: String, body: String?): JSONObject {
        return requestJson(
            method = method,
            path = path,
            bodyBytes = body?.toByteArray(Charsets.UTF_8),
            contentType = if (body != null) "application/json" else null,
        )
    }

    private fun requestJson(
        method: String,
        path: String,
        bodyBytes: ByteArray?,
        contentType: String?,
    ): JSONObject {
        val connection = openConnection(path, method, contentType)
        return try {
            if (bodyBytes != null) {
                connection.doOutput = true
                connection.outputStream.use { stream ->
                    stream.write(bodyBytes)
                }
            }

            val status = connection.responseCode
            val responseText = readResponseBody(connection, status)

            if (status !in 200..299) {
                val message = parseErrorMessage(responseText)
                throw ApiClientException.Server(status, message)
            }

            try {
                JSONObject(responseText)
            } catch (error: Exception) {
                throw ApiClientException.Protocol("Invalid JSON response: ${error.message}")
            }
        } catch (error: ApiClientException) {
            throw error
        } catch (error: Exception) {
            throw ApiClientException.Network(error.message ?: "Network request failed")
        } finally {
            connection.disconnect()
        }
    }

    private fun openConnection(path: String, method: String): HttpURLConnection {
        return openConnection(
            path = path,
            method = method,
            contentType = if (method == "POST") "application/json" else null,
        )
    }

    private fun openConnection(
        path: String,
        method: String,
        contentType: String?,
    ): HttpURLConnection {
        val url = URL(joinUrl(path))
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = connectTimeoutMs
            readTimeout = readTimeoutMs
            // Use a broad accept header to avoid HTML-only route gates on some SSR runtimes.
            setRequestProperty("Accept", "*/*")
            setRequestProperty("X-Client-Platform", clientPlatform)
            setRequestProperty("X-Client-Version", clientVersion)
            setRequestProperty("X-Request-Id", requestIdProvider())
            defaultHeaders.forEach { (header, value) ->
                setRequestProperty(header, value)
            }
            if (!contentType.isNullOrEmpty()) {
                setRequestProperty("Content-Type", contentType)
            }
        }
        return connection
    }

    private fun joinUrl(path: String): String {
        val normalizedBase = if (baseUrl.endsWith("/")) baseUrl.dropLast(1) else baseUrl
        val normalizedPath = if (path.startsWith("/")) path else "/$path"
        return normalizedBase + normalizedPath
    }

    private fun readResponseBody(connection: HttpURLConnection, status: Int): String {
        val stream: InputStream? = if (status in 200..299) {
            connection.inputStream
        } else {
            connection.errorStream
        }

        if (stream == null) {
            return ""
        }

        stream.use { input ->
            BufferedReader(InputStreamReader(input, Charsets.UTF_8)).use { reader ->
                return reader.readText()
            }
        }
    }

    private fun parseErrorMessage(raw: String): String {
        if (raw.isBlank()) {
            return "Unknown server error"
        }

        return try {
            JSONObject(raw).optString("error").ifBlank { raw }
        } catch (_: Exception) {
            raw
        }
    }

    internal fun buildMultipartUploadBody(
        data: ByteArray,
        filename: String,
        boundary: String,
    ): ByteArray {
        val safeFilename = sanitizeMultipartValue(filename)
        val out = ByteArrayOutputStream(data.size + 512)

        out.writeAscii("--$boundary$MULTIPART_LINE_BREAK")
        out.writeAscii(
            "Content-Disposition: form-data; name=\"file\"; filename=\"$safeFilename\"$MULTIPART_LINE_BREAK",
        )
        out.writeAscii("Content-Type: application/octet-stream$MULTIPART_LINE_BREAK$MULTIPART_LINE_BREAK")
        out.write(data)
        out.writeAscii(MULTIPART_LINE_BREAK)

        out.writeAscii("--$boundary$MULTIPART_LINE_BREAK")
        out.writeAscii("Content-Disposition: form-data; name=\"filename\"$MULTIPART_LINE_BREAK$MULTIPART_LINE_BREAK")
        out.writeAscii("$safeFilename$MULTIPART_LINE_BREAK")

        out.writeAscii("--$boundary--$MULTIPART_LINE_BREAK")
        return out.toByteArray()
    }

    private fun sanitizeMultipartValue(value: String): String {
        return value
            .replace("\"", "_")
            .replace("\r", " ")
            .replace("\n", " ")
    }

    private fun ByteArrayOutputStream.writeAscii(value: String) {
        write(value.toByteArray(Charsets.UTF_8))
    }

    private companion object {
        const val MULTIPART_LINE_BREAK = "\r\n"
    }
}
