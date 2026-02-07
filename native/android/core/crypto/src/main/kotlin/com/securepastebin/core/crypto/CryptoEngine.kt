package com.securepastebin.core.crypto

/**
 * Core cryptography constants and interfaces for Android implementation parity.
 */
object CryptoEngine {
    const val PAYLOAD_VERSION: UByte = 1u
}

/**
 * Metadata attached to encrypted payloads.
 */
data class CryptoFileMetadata(
    val name: String,
    val size: Int,
    val mimeType: String,
    val uploadDate: Long,
    val expirationDate: Long?,
    val encryptionConfig: EncryptionConfig,
) {
    data class EncryptionConfig(
        val encryptMetadata: Boolean,
        val algorithm: String,
    )
}

/**
 * Result of encrypting plaintext for upload.
 */
data class EncryptionResult(
    val serializedPayload: ByteArray,
    val privateKeyBase64Url: String,
)

/**
 * Result of decrypting payload bytes from storage.
 */
data class DecryptionResult(
    val plaintext: ByteArray,
    val metadata: CryptoFileMetadata,
)

/**
 * Contract implemented by platform crypto integration.
 */
interface NativeCryptoEngine {
    suspend fun encrypt(
        plaintext: ByteArray,
        password: String,
        metadata: CryptoFileMetadata,
        encryptMetadata: Boolean,
    ): EncryptionResult

    suspend fun decrypt(
        serializedPayload: ByteArray,
        password: String,
        privateKeyBase64Url: String,
    ): DecryptionResult
}

/**
 * Placeholder crypto implementation until production crypto integration lands.
 */
class UnimplementedNativeCryptoEngine : NativeCryptoEngine {
    override suspend fun encrypt(
        plaintext: ByteArray,
        password: String,
        metadata: CryptoFileMetadata,
        encryptMetadata: Boolean,
    ): EncryptionResult {
        throw UnsupportedOperationException("Native crypto engine implementation is not available yet.")
    }

    override suspend fun decrypt(
        serializedPayload: ByteArray,
        password: String,
        privateKeyBase64Url: String,
    ): DecryptionResult {
        throw UnsupportedOperationException("Native crypto engine implementation is not available yet.")
    }
}
