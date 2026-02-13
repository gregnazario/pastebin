package com.securepastebin.core.crypto

import org.json.JSONObject
import java.security.MessageDigest
import java.util.Base64
import java.util.UUID

/**
 * Development-only crypto engine for end-to-end UI flow wiring.
 *
 * IMPORTANT:
 * This implementation is intentionally non-production and is only used to
 * unblock native feature flow integration before full cryptography parity
 * (ML-KEM + AES + Argon2id) is completed.
 */
class DevelopmentNativeCryptoEngine : NativeCryptoEngine {
    override suspend fun encrypt(
        plaintext: ByteArray,
        password: String,
        metadata: CryptoFileMetadata,
        encryptMetadata: Boolean,
    ): EncryptionResult {
        val privateKey = UUID.randomUUID().toString().replace("-", "")
        val envelope = JSONObject().apply {
            put("version", CryptoEngine.PAYLOAD_VERSION.toInt())
            put("privateKeyBase64Url", privateKey)
            put("passwordHashHex", passwordHashHex(password))
            put("metadata", metadataToJson(metadata))
            put("plaintextBase64Url", encodeBase64Url(plaintext))
            put("encryptMetadata", encryptMetadata)
        }

        return EncryptionResult(
            serializedPayload = envelope.toString().toByteArray(Charsets.UTF_8),
            privateKeyBase64Url = privateKey,
        )
    }

    override suspend fun decrypt(
        serializedPayload: ByteArray,
        password: String,
        privateKeyBase64Url: String,
    ): DecryptionResult {
        val envelope = try {
            JSONObject(String(serializedPayload, Charsets.UTF_8))
        } catch (_: Exception) {
            throw IllegalArgumentException("Invalid encrypted payload.")
        }

        val version = envelope.optInt("version", -1)
        if (version != CryptoEngine.PAYLOAD_VERSION.toInt()) {
            throw IllegalArgumentException("Unsupported payload version.")
        }

        val expectedKey = envelope.optString("privateKeyBase64Url")
        if (expectedKey != privateKeyBase64Url) {
            throw IllegalArgumentException("Private key fragment does not match payload.")
        }

        val expectedPasswordHash = envelope.optString("passwordHashHex")
        if (expectedPasswordHash != passwordHashHex(password)) {
            throw IllegalArgumentException("Invalid password.")
        }

        val plaintextBase64Url = envelope.optString("plaintextBase64Url")
        val plaintext = decodeBase64Url(plaintextBase64Url)
            ?: throw IllegalArgumentException("Encrypted payload plaintext is invalid.")

        val metadataJson = envelope.optJSONObject("metadata")
            ?: throw IllegalArgumentException("Encrypted payload metadata is invalid.")

        return DecryptionResult(
            plaintext = plaintext,
            metadata = metadataFromJson(metadataJson),
        )
    }

    private fun passwordHashHex(password: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(password.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { byte -> "%02x".format(byte) }
    }

    private fun encodeBase64Url(bytes: ByteArray): String {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    private fun decodeBase64Url(value: String): ByteArray? {
        return try {
            Base64.getUrlDecoder().decode(value)
        } catch (_: Exception) {
            null
        }
    }

    private fun metadataToJson(metadata: CryptoFileMetadata): JSONObject {
        return JSONObject().apply {
            put("name", metadata.name)
            put("size", metadata.size)
            put("mimeType", metadata.mimeType)
            put("uploadDate", metadata.uploadDate)
            if (metadata.expirationDate == null) {
                put("expirationDate", JSONObject.NULL)
            } else {
                put("expirationDate", metadata.expirationDate)
            }
            put(
                "encryptionConfig",
                JSONObject().apply {
                    put("encryptMetadata", metadata.encryptionConfig.encryptMetadata)
                    put("algorithm", metadata.encryptionConfig.algorithm)
                },
            )
        }
    }

    private fun metadataFromJson(json: JSONObject): CryptoFileMetadata {
        val encryptionConfig = json.getJSONObject("encryptionConfig")
        return CryptoFileMetadata(
            name = json.getString("name"),
            size = json.getInt("size"),
            mimeType = json.getString("mimeType"),
            uploadDate = json.getLong("uploadDate"),
            expirationDate = if (json.isNull("expirationDate")) null else json.getLong("expirationDate"),
            encryptionConfig = CryptoFileMetadata.EncryptionConfig(
                encryptMetadata = encryptionConfig.getBoolean("encryptMetadata"),
                algorithm = encryptionConfig.getString("algorithm"),
            ),
        )
    }
}
