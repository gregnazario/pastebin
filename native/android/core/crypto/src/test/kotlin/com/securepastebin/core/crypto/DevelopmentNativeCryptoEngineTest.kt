package com.securepastebin.core.crypto

import kotlinx.coroutines.runBlocking
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Roundtrip tests for the development native crypto adapter.
 */
class DevelopmentNativeCryptoEngineTest {
    @Test
    fun developmentEngineRoundTripsPayload(): Unit = runBlocking {
        val engine = DevelopmentNativeCryptoEngine()
        val metadata = CryptoFileMetadata(
            name = "note.txt",
            size = 2,
            mimeType = "text/plain",
            uploadDate = 1_738_886_400_000,
            expirationDate = null,
            encryptionConfig = CryptoFileMetadata.EncryptionConfig(
                encryptMetadata = false,
                algorithm = "dev-only",
            ),
        )

        val encrypted = engine.encrypt(
            plaintext = byteArrayOf(72, 73),
            password = "DevPass#1",
            metadata = metadata,
            encryptMetadata = false,
        )

        val decrypted = engine.decrypt(
            serializedPayload = encrypted.serializedPayload,
            password = "DevPass#1",
            privateKeyBase64Url = encrypted.privateKeyBase64Url,
        )

        assertTrue(decrypted.plaintext.contentEquals(byteArrayOf(72, 73)))
        assertEquals(metadata, decrypted.metadata)
    }
}
