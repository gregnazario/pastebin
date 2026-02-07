package com.securepastebin.feature.view

import com.securepastebin.core.crypto.CryptoFileMetadata
import com.securepastebin.core.crypto.DecryptionResult
import com.securepastebin.core.crypto.EncryptionResult
import com.securepastebin.core.crypto.NativeCryptoEngine
import com.securepastebin.core.network.ApiClient
import com.securepastebin.core.network.DownloadResponse
import com.securepastebin.core.network.HealthResponse
import com.securepastebin.core.network.UploadResponse
import com.securepastebin.core.storage.HistoryEntry
import com.securepastebin.core.storage.HistoryStore
import kotlinx.coroutines.runBlocking
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Decrypt flow orchestration tests with fake dependencies.
 */
class ViewFeatureTest {
    @Test
    fun decryptParsesLinkDownloadsPayloadAndDecrypts(): Unit = runBlocking {
        val expectedMetadata = CryptoFileMetadata(
            name = "vector.txt",
            size = 2,
            mimeType = "text/plain",
            uploadDate = 1,
            expirationDate = null,
            encryptionConfig = CryptoFileMetadata.EncryptionConfig(
                encryptMetadata = false,
                algorithm = "Kyber768+AES256-GCM",
            ),
        )

        val fakeApiClient = FakeApiClient(downloadResponse = DownloadResponse(byteArrayOf(9, 9, 9)))
        val fakeCryptoEngine = FakeCryptoEngine(
            decryptionResult = DecryptionResult(
                plaintext = byteArrayOf(72, 73),
                metadata = expectedMetadata,
            ),
        )
        val fakeHistoryStore = FakeHistoryStore()

        val service = ViewFeature(
            apiClient = fakeApiClient,
            cryptoEngine = fakeCryptoEngine,
            historyStore = fakeHistoryStore,
            nowMillis = { 1234 },
        )

        val result = service.decrypt(
            DecryptRequest(
                shareUrl = "https://pastebin.sed.fyi/p/file-abc#key_fragment",
                password = "StrongPass#2026",
            ),
        )

        assertEquals("file-abc", result.id)
        assertTrue(result.plaintext.contentEquals(byteArrayOf(72, 73)))
        assertEquals(expectedMetadata, result.metadata)
        assertEquals("file-abc", fakeApiClient.downloadedID)
        assertEquals("key_fragment", fakeCryptoEngine.capturedPrivateKey)
        assertEquals(1, fakeHistoryStore.entries.size)
        assertEquals("file-abc", fakeHistoryStore.entries.first().id)
        assertEquals("vector.txt", fakeHistoryStore.entries.first().fileName)
        assertEquals(1234, fakeHistoryStore.entries.first().createdAtMillis)
        assertEquals(0, fakeHistoryStore.entries.first().expiresAtMillis)
    }

    private class FakeApiClient(
        private val downloadResponse: DownloadResponse,
    ) : ApiClient {
        var downloadedID: String? = null

        override suspend fun uploadEncryptedBlob(data: ByteArray, filename: String): UploadResponse {
            return UploadResponse(id = "unused", expiresAt = 0)
        }

        override suspend fun downloadEncryptedBlob(id: String): DownloadResponse {
            downloadedID = id
            return downloadResponse
        }

        override suspend fun health(): HealthResponse {
            return HealthResponse(configured = true, account = null)
        }
    }

    private class FakeCryptoEngine(
        private val decryptionResult: DecryptionResult,
    ) : NativeCryptoEngine {
        var capturedPrivateKey: String? = null

        override suspend fun encrypt(
            plaintext: ByteArray,
            password: String,
            metadata: CryptoFileMetadata,
            encryptMetadata: Boolean,
        ): EncryptionResult {
            throw UnsupportedOperationException("Not used in this test")
        }

        override suspend fun decrypt(
            serializedPayload: ByteArray,
            password: String,
            privateKeyBase64Url: String,
        ): DecryptionResult {
            capturedPrivateKey = privateKeyBase64Url
            return decryptionResult
        }
    }

    private class FakeHistoryStore : HistoryStore {
        val entries = mutableListOf<HistoryEntry>()

        override suspend fun upsert(entry: HistoryEntry) {
            entries.removeAll { it.id == entry.id }
            entries.add(entry)
        }

        override suspend fun list(): List<HistoryEntry> {
            return entries.toList()
        }

        override suspend fun delete(id: String) {
            entries.removeAll { it.id == id }
        }
    }
}
