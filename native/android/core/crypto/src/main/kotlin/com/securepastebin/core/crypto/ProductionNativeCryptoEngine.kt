package com.securepastebin.core.crypto

import org.bouncycastle.crypto.digests.SHA256Digest
import org.bouncycastle.crypto.generators.Argon2BytesGenerator
import org.bouncycastle.crypto.generators.HKDFBytesGenerator
import org.bouncycastle.crypto.params.Argon2Parameters
import org.bouncycastle.crypto.params.HKDFParameters
import org.bouncycastle.pqc.crypto.mlkem.MLKEMExtractor
import org.bouncycastle.pqc.crypto.mlkem.MLKEMGenerator
import org.bouncycastle.pqc.crypto.mlkem.MLKEMKeyGenerationParameters
import org.bouncycastle.pqc.crypto.mlkem.MLKEMKeyPairGenerator
import org.bouncycastle.pqc.crypto.mlkem.MLKEMParameters
import org.bouncycastle.pqc.crypto.mlkem.MLKEMPrivateKeyParameters
import org.bouncycastle.pqc.crypto.mlkem.MLKEMPublicKeyParameters
import org.json.JSONObject
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Production-ready crypto engine with web-compatible payload semantics.
 */
class ProductionNativeCryptoEngine(
    private val secureRandom: SecureRandom = SecureRandom(),
) : NativeCryptoEngine {
    override suspend fun encrypt(
        plaintext: ByteArray,
        password: String,
        metadata: CryptoFileMetadata,
        encryptMetadata: Boolean,
    ): EncryptionResult {
        val keyPair = generateMlKemKeyPair()
        val salt = randomBytes(SALT_LENGTH)
        val derivedKey = deriveArgon2idKey(password = password, salt = salt)

        val encapsulation = encapsulateSharedSecret(keyPair.publicKey)
        val combinedKey = deriveHkdfKey(
            ikm = derivedKey + encapsulation.sharedSecret,
            salt = salt,
            info = HYBRID_KEY_INFO,
        )

        val aesCiphertext = encryptAesCombined(plaintext = plaintext, key = combinedKey)
        val metadataJsonBytes = metadataToJson(metadata).toString().toByteArray(Charsets.UTF_8)

        val metadataBytes = if (encryptMetadata) {
            val metadataKey = deriveHkdfKey(
                ikm = derivedKey,
                salt = salt,
                info = METADATA_KEY_INFO,
            )
            encryptAesCombined(plaintext = metadataJsonBytes, key = metadataKey)
        } else {
            metadataJsonBytes
        }

        val serialized = serializePayload(
            version = CryptoEngine.PAYLOAD_VERSION.toByte(),
            metadataEncrypted = encryptMetadata,
            salt = salt,
            kyberCiphertext = encapsulation.ciphertext,
            aesCiphertext = aesCiphertext,
            metadata = metadataBytes,
        )

        return EncryptionResult(
            serializedPayload = serialized,
            privateKeyBase64Url = encodeBase64Url(keyPair.privateKey.encoded),
        )
    }

    override suspend fun decrypt(
        serializedPayload: ByteArray,
        password: String,
        privateKeyBase64Url: String,
    ): DecryptionResult {
        val payload = deserializePayload(serializedPayload)

        val privateKeyBytes = decodeBase64Url(privateKeyBase64Url)
            ?: throw IllegalArgumentException("Private key fragment is invalid.")
        val privateKey = try {
            MLKEMPrivateKeyParameters(MLKEMParameters.ml_kem_768, privateKeyBytes)
        } catch (_: Exception) {
            throw IllegalArgumentException("Private key fragment is invalid.")
        }

        val sharedSecret = try {
            MLKEMExtractor(privateKey).extractSecret(payload.kyberCiphertext)
        } catch (_: Exception) {
            throw IllegalArgumentException("Private key fragment does not match payload.")
        }

        val derivedKey = deriveArgon2idKey(password = password, salt = payload.salt)
        val combinedKey = deriveHkdfKey(
            ikm = derivedKey + sharedSecret,
            salt = payload.salt,
            info = HYBRID_KEY_INFO,
        )

        val plaintext = try {
            decryptAesCombined(combinedCiphertext = payload.aesCiphertext, key = combinedKey)
        } catch (_: Exception) {
            throw IllegalArgumentException("Invalid password or corrupted payload.")
        }

        val metadataBytes = if (payload.metadataEncrypted) {
            val metadataKey = deriveHkdfKey(
                ikm = derivedKey,
                salt = payload.salt,
                info = METADATA_KEY_INFO,
            )
            try {
                decryptAesCombined(combinedCiphertext = payload.metadata, key = metadataKey)
            } catch (_: Exception) {
                throw IllegalArgumentException("Encrypted metadata cannot be decrypted.")
            }
        } else {
            payload.metadata
        }

        val metadataJson = try {
            JSONObject(String(metadataBytes, Charsets.UTF_8))
        } catch (_: Exception) {
            throw IllegalArgumentException("Encrypted metadata cannot be parsed.")
        }

        return DecryptionResult(
            plaintext = plaintext,
            metadata = metadataFromJson(metadataJson),
        )
    }

    private fun generateMlKemKeyPair(): MlKemKeyPair {
        val generator = MLKEMKeyPairGenerator()
        generator.init(MLKEMKeyGenerationParameters(secureRandom, MLKEMParameters.ml_kem_768))
        val keyPair = generator.generateKeyPair()
        return MlKemKeyPair(
            publicKey = keyPair.public as MLKEMPublicKeyParameters,
            privateKey = keyPair.private as MLKEMPrivateKeyParameters,
        )
    }

    private fun encapsulateSharedSecret(publicKey: MLKEMPublicKeyParameters): EncapsulationResult {
        val encapsulated = MLKEMGenerator(secureRandom).generateEncapsulated(publicKey)
        return EncapsulationResult(
            sharedSecret = encapsulated.secret,
            ciphertext = encapsulated.encapsulation,
        )
    }

    private fun deriveArgon2idKey(password: String, salt: ByteArray): ByteArray {
        val params = Argon2Parameters.Builder(Argon2Parameters.ARGON2_id)
            .withIterations(ARGON2_ITERATIONS)
            .withMemoryAsKB(ARGON2_MEMORY_KB)
            .withParallelism(ARGON2_PARALLELISM)
            .withVersion(Argon2Parameters.ARGON2_VERSION_13)
            .withSalt(salt)
            .build()

        val generator = Argon2BytesGenerator()
        generator.init(params)
        return ByteArray(ARGON2_HASH_LENGTH).also {
            generator.generateBytes(password.toByteArray(Charsets.UTF_8), it)
        }
    }

    private fun deriveHkdfKey(ikm: ByteArray, salt: ByteArray, info: ByteArray): ByteArray {
        val generator = HKDFBytesGenerator(SHA256Digest())
        generator.init(HKDFParameters(ikm, salt, info))
        return ByteArray(HKDF_OUTPUT_LENGTH).also { output ->
            generator.generateBytes(output, 0, output.size)
        }
    }

    private fun encryptAesCombined(plaintext: ByteArray, key: ByteArray): ByteArray {
        val nonce = randomBytes(AES_NONCE_SIZE)
        val cipher = Cipher.getInstance(AES_TRANSFORM)
        cipher.init(
            Cipher.ENCRYPT_MODE,
            SecretKeySpec(key, AES_ALGORITHM),
            GCMParameterSpec(AES_TAG_BITS, nonce),
        )
        val ciphertextWithTag = cipher.doFinal(plaintext)
        return nonce + ciphertextWithTag
    }

    private fun decryptAesCombined(combinedCiphertext: ByteArray, key: ByteArray): ByteArray {
        require(combinedCiphertext.size > AES_NONCE_SIZE) { "Ciphertext is too short." }
        val nonce = combinedCiphertext.copyOfRange(0, AES_NONCE_SIZE)
        val ciphertextWithTag = combinedCiphertext.copyOfRange(AES_NONCE_SIZE, combinedCiphertext.size)
        val cipher = Cipher.getInstance(AES_TRANSFORM)
        cipher.init(
            Cipher.DECRYPT_MODE,
            SecretKeySpec(key, AES_ALGORITHM),
            GCMParameterSpec(AES_TAG_BITS, nonce),
        )
        return cipher.doFinal(ciphertextWithTag)
    }

    private fun serializePayload(
        version: Byte,
        metadataEncrypted: Boolean,
        salt: ByteArray,
        kyberCiphertext: ByteArray,
        aesCiphertext: ByteArray,
        metadata: ByteArray,
    ): ByteArray {
        val flags = if (metadataEncrypted) 0x01 else 0x00

        val totalSize =
            1 +
            1 +
            2 +
            salt.size +
            2 +
            kyberCiphertext.size +
            4 +
            aesCiphertext.size +
            4 +
            metadata.size

        val output = ByteArray(totalSize)
        var offset = 0

        output[offset++] = version
        output[offset++] = flags.toByte()

        writeUInt16(salt.size, output, offset)
        offset += 2
        salt.copyInto(output, offset)
        offset += salt.size

        writeUInt16(kyberCiphertext.size, output, offset)
        offset += 2
        kyberCiphertext.copyInto(output, offset)
        offset += kyberCiphertext.size

        writeUInt32(aesCiphertext.size, output, offset)
        offset += 4
        aesCiphertext.copyInto(output, offset)
        offset += aesCiphertext.size

        writeUInt32(metadata.size, output, offset)
        offset += 4
        metadata.copyInto(output, offset)

        return output
    }

    private fun deserializePayload(payload: ByteArray): ParsedPayload {
        require(payload.size >= 14) { "Payload is too short." }

        var offset = 0

        fun readBytes(count: Int): ByteArray {
            require(offset + count <= payload.size) { "Payload is malformed." }
            return payload.copyOfRange(offset, offset + count).also { offset += count }
        }

        fun readUInt16(): Int {
            val bytes = readBytes(2)
            return ((bytes[0].toInt() and 0xff) shl 8) or (bytes[1].toInt() and 0xff)
        }

        fun readUInt32(): Int {
            val bytes = readBytes(4)
            return ((bytes[0].toInt() and 0xff) shl 24) or
                ((bytes[1].toInt() and 0xff) shl 16) or
                ((bytes[2].toInt() and 0xff) shl 8) or
                (bytes[3].toInt() and 0xff)
        }

        val version = readBytes(1)[0].toUByte()
        require(version == CryptoEngine.PAYLOAD_VERSION) { "Unsupported payload version." }

        val flags = readBytes(1)[0].toInt() and 0xff
        val metadataEncrypted = (flags and 0x01) != 0

        val saltLength = readUInt16()
        require(saltLength in 1..64) { "Invalid salt length." }
        val salt = readBytes(saltLength)

        val kyberLength = readUInt16()
        require(kyberLength == KYBER_CIPHERTEXT_LENGTH) { "Invalid ML-KEM ciphertext length." }
        val kyberCiphertext = readBytes(kyberLength)

        val aesLength = readUInt32()
        require(aesLength in 1..MAX_AES_CIPHERTEXT_BYTES) { "Invalid AES ciphertext length." }
        val aesCiphertext = readBytes(aesLength)

        val metadataLength = readUInt32()
        require(metadataLength in 1..MAX_METADATA_BYTES) { "Invalid metadata length." }
        val metadata = readBytes(metadataLength)

        require(offset == payload.size) { "Payload has trailing bytes." }

        return ParsedPayload(
            metadataEncrypted = metadataEncrypted,
            salt = salt,
            kyberCiphertext = kyberCiphertext,
            aesCiphertext = aesCiphertext,
            metadata = metadata,
        )
    }

    private fun randomBytes(size: Int): ByteArray = ByteArray(size).also(secureRandom::nextBytes)

    private fun writeUInt16(value: Int, output: ByteArray, offset: Int) {
        output[offset] = ((value ushr 8) and 0xff).toByte()
        output[offset + 1] = (value and 0xff).toByte()
    }

    private fun writeUInt32(value: Int, output: ByteArray, offset: Int) {
        output[offset] = ((value ushr 24) and 0xff).toByte()
        output[offset + 1] = ((value ushr 16) and 0xff).toByte()
        output[offset + 2] = ((value ushr 8) and 0xff).toByte()
        output[offset + 3] = (value and 0xff).toByte()
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

    private data class MlKemKeyPair(
        val publicKey: MLKEMPublicKeyParameters,
        val privateKey: MLKEMPrivateKeyParameters,
    )

    private data class EncapsulationResult(
        val sharedSecret: ByteArray,
        val ciphertext: ByteArray,
    )

    private data class ParsedPayload(
        val metadataEncrypted: Boolean,
        val salt: ByteArray,
        val kyberCiphertext: ByteArray,
        val aesCiphertext: ByteArray,
        val metadata: ByteArray,
    )

    private companion object {
        const val ARGON2_ITERATIONS = 4
        const val ARGON2_MEMORY_KB = 256 * 1024
        const val ARGON2_PARALLELISM = 4
        const val ARGON2_HASH_LENGTH = 32
        const val HKDF_OUTPUT_LENGTH = 32

        const val AES_NONCE_SIZE = 12
        const val AES_TAG_BITS = 128
        const val AES_ALGORITHM = "AES"
        const val AES_TRANSFORM = "AES/GCM/NoPadding"
        const val SALT_LENGTH = 32
        const val KYBER_CIPHERTEXT_LENGTH = 1088
        const val MAX_AES_CIPHERTEXT_BYTES = 1024 * 1024 * 1024
        const val MAX_METADATA_BYTES = 1024 * 1024

        val HYBRID_KEY_INFO = "pastebin-hybrid-key-v1".toByteArray(Charsets.UTF_8)
        val METADATA_KEY_INFO = "pastebin-metadata-key-v1".toByteArray(Charsets.UTF_8)
    }
}
