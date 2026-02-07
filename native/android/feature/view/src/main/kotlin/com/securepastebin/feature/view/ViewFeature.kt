package com.securepastebin.feature.view

import com.securepastebin.core.crypto.CryptoFileMetadata
import com.securepastebin.core.crypto.NativeCryptoEngine
import com.securepastebin.core.network.ApiClient
import java.net.URI
import java.net.URLDecoder

/**
 * Input model for decrypt orchestration.
 */
data class DecryptRequest(
    val shareUrl: String,
    val password: String,
)

/**
 * Output model for decrypt orchestration.
 */
data class DecryptResult(
    val id: String,
    val plaintext: ByteArray,
    val metadata: CryptoFileMetadata,
)

/**
 * Decrypt orchestration error types.
 */
sealed class DecryptServiceError(message: String) : Exception(message) {
    class InvalidShareUrl : DecryptServiceError("Share URL is invalid.")
    class MissingFileId : DecryptServiceError("Share URL does not contain a file ID.")
    class MissingKeyFragment : DecryptServiceError("Share URL does not include a private key fragment.")
}

/**
 * View feature service coordinating download + decrypt.
 */
class ViewFeature(
    private val apiClient: ApiClient,
    private val cryptoEngine: NativeCryptoEngine,
) {
    suspend fun decrypt(request: DecryptRequest): DecryptResult {
        val parsed = parseShareUrl(request.shareUrl)
        val download = apiClient.downloadEncryptedBlob(parsed.id)
        val decrypted = cryptoEngine.decrypt(
            serializedPayload = download.data,
            password = request.password,
            privateKeyBase64Url = parsed.privateKeyBase64Url,
        )

        return DecryptResult(
            id = parsed.id,
            plaintext = decrypted.plaintext,
            metadata = decrypted.metadata,
        )
    }

    private fun parseShareUrl(shareUrl: String): ParsedShareUrl {
        val uri = try {
            URI.create(shareUrl)
        } catch (_: Exception) {
            throw DecryptServiceError.InvalidShareUrl()
        }

        val rawPath = uri.path ?: throw DecryptServiceError.MissingFileId()
        val marker = "/p/"
        val markerIndex = rawPath.lastIndexOf(marker)
        if (markerIndex < 0) {
            throw DecryptServiceError.MissingFileId()
        }

        val encodedID = rawPath.substring(markerIndex + marker.length)
        if (encodedID.isBlank()) {
            throw DecryptServiceError.MissingFileId()
        }
        val id = URLDecoder.decode(encodedID, Charsets.UTF_8.name())

        val fragment = uri.fragment
        if (fragment.isNullOrBlank()) {
            throw DecryptServiceError.MissingKeyFragment()
        }

        return ParsedShareUrl(id = id, privateKeyBase64Url = fragment)
    }

    private data class ParsedShareUrl(
        val id: String,
        val privateKeyBase64Url: String,
    )
}
