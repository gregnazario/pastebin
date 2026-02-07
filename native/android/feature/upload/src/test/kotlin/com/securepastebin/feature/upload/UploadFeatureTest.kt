package com.securepastebin.feature.upload

import com.securepastebin.core.crypto.CryptoFileMetadata
import com.securepastebin.core.crypto.DecryptionResult
import com.securepastebin.core.crypto.EncryptionResult
import com.securepastebin.core.crypto.NativeCryptoEngine
import com.securepastebin.core.network.ApiClient
import com.securepastebin.core.network.DownloadResponse
import com.securepastebin.core.network.HealthResponse
import com.securepastebin.core.network.UploadResponse
import kotlinx.coroutines.runBlocking
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Upload flow orchestration tests with fake dependencies.
 */
class UploadFeatureTest {
    @Test
    fun uploadBuildsShareLinkAndUsesEncryptedFilenameWhenMetadataEncrypted(): Unit = runBlocking {
        val fakeApiClient = FakeApiClient(UploadResponse(id = "file-123", expiresAt = 1_740_000_000_000))
        val fakeCryptoEngine = FakeCryptoEngine(
            EncryptionResult(
                serializedPayload = byteArrayOf(1, 2, 3, 4),
                privateKeyBase64Url = "private_key_fragment",
            ),
        )

        val service = UploadFeature(
            apiClient = fakeApiClient,
            cryptoEngine = fakeCryptoEngine,
            shareBaseUrl = "https://pastebin.sed.fyi",
            nowMillis = { 1_738_886_400_000 },
        )

        val result = service.upload(
            UploadRequest(
                plaintext = byteArrayOf(72, 73),
                filename = "secret.txt",
                mimeType = "text/plain",
                password = "StrongPass#2026",
                encryptMetadata = true,
            ),
        )

        assertEquals("file-123", result.id)
        assertEquals("private_key_fragment", result.privateKeyBase64Url)
        assertEquals("https://pastebin.sed.fyi/p/file-123#private_key_fragment", result.shareUrl)
        assertEquals("encrypted", fakeApiClient.uploadedFilename)
        assertTrue(fakeApiClient.uploadedData.contentEquals(byteArrayOf(1, 2, 3, 4)))
        assertEquals("StrongPass#2026", fakeCryptoEngine.capturedPassword)
    }

    private class FakeApiClient(
        private val uploadResponse: UploadResponse,
    ) : ApiClient {
        var uploadedData: ByteArray = byteArrayOf()
        var uploadedFilename: String = ""

        override suspend fun uploadEncryptedBlob(data: ByteArray, filename: String): UploadResponse {
            uploadedData = data
            uploadedFilename = filename
            return uploadResponse
        }

        override suspend fun downloadEncryptedBlob(id: String): DownloadResponse {
            return DownloadResponse(data = byteArrayOf())
        }

        override suspend fun health(): HealthResponse {
            return HealthResponse(configured = true, account = null)
        }
    }

    private class FakeCryptoEngine(
        private val encryptionResult: EncryptionResult,
    ) : NativeCryptoEngine {
        var capturedPassword: String? = null

        override suspend fun encrypt(
            plaintext: ByteArray,
            password: String,
            metadata: CryptoFileMetadata,
            encryptMetadata: Boolean,
        ): EncryptionResult {
            capturedPassword = password
            return encryptionResult
        }

        override suspend fun decrypt(
            serializedPayload: ByteArray,
            password: String,
            privateKeyBase64Url: String,
        ): DecryptionResult {
            throw UnsupportedOperationException("Not used in this test")
        }
    }
}
