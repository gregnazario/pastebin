package com.securepastebin.feature.upload

import com.securepastebin.core.crypto.CryptoFileMetadata
import com.securepastebin.core.crypto.NativeCryptoEngine
import com.securepastebin.core.network.ApiClient
import java.net.URI
import java.net.URLEncoder

/**
 * Input model for upload orchestration.
 */
data class UploadRequest(
    val plaintext: ByteArray,
    val filename: String,
    val mimeType: String,
    val password: String,
    val encryptMetadata: Boolean,
)

/**
 * Output model for upload orchestration.
 */
data class UploadResult(
    val id: String,
    val expiresAt: Long,
    val shareUrl: String,
    val privateKeyBase64Url: String,
)

/**
 * Upload feature service coordinating crypto + API upload.
 */
class UploadFeature(
    private val apiClient: ApiClient,
    private val cryptoEngine: NativeCryptoEngine,
    private val shareBaseUrl: String,
    private val nowMillis: () -> Long = { System.currentTimeMillis() },
) {
    suspend fun upload(request: UploadRequest): UploadResult {
        val metadata = CryptoFileMetadata(
            name = request.filename,
            size = request.plaintext.size,
            mimeType = request.mimeType,
            uploadDate = nowMillis(),
            expirationDate = null,
            encryptionConfig = CryptoFileMetadata.EncryptionConfig(
                encryptMetadata = request.encryptMetadata,
                algorithm = "Kyber768+AES256-GCM",
            ),
        )

        val encrypted = cryptoEngine.encrypt(
            plaintext = request.plaintext,
            password = request.password,
            metadata = metadata,
            encryptMetadata = request.encryptMetadata,
        )

        val uploadFilename = if (request.encryptMetadata) "encrypted" else request.filename
        val response = apiClient.uploadEncryptedBlob(
            data = encrypted.serializedPayload,
            filename = uploadFilename,
        )

        val shareUrl = buildShareUrl(
            baseUrl = shareBaseUrl,
            id = response.id,
            privateKeyBase64Url = encrypted.privateKeyBase64Url,
        )

        return UploadResult(
            id = response.id,
            expiresAt = response.expiresAt,
            shareUrl = shareUrl,
            privateKeyBase64Url = encrypted.privateKeyBase64Url,
        )
    }

    private fun buildShareUrl(baseUrl: String, id: String, privateKeyBase64Url: String): String {
        val base = if (baseUrl.endsWith("/")) baseUrl.dropLast(1) else baseUrl
        val encodedID = URLEncoder.encode(id, Charsets.UTF_8.name())
        val uri = URI.create("$base/p/$encodedID#$privateKeyBase64Url")
        return uri.toString()
    }
}
