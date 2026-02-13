/// Production crypto engine for native Apple clients with web-format parity.
///
/// Implements:
/// - ML-KEM-768 via SwiftKyber
/// - Argon2id via C Argon2 reference implementation
/// - HKDF-SHA256 key derivation
/// - AES-256-GCM payload encryption
/// - Binary payload serialization compatible with web implementation
import CArgon2
import CryptoKit
import Foundation
import SwiftKyber

private struct SerializedPayload {
    let version: UInt8
    let metadataEncrypted: Bool
    let salt: [UInt8]
    let kyberCiphertext: [UInt8]
    let aesCiphertext: [UInt8]
    let metadata: [UInt8]
}

/// Production-ready native cryptography adapter.
public struct ProductionNativeCryptoEngine: NativeCryptoEngine {
    private static let mlkem = Kyber.K768
    private static let argonIterations: UInt32 = 4
    private static let argonMemoryKB: UInt32 = 256 * 1024
    private static let argonParallelism: UInt32 = 4
    private static let argonHashLength: Int = 32
    private static let saltLength: Int = 32
    private static let expectedKyberCiphertextLength: Int = 1088
    private static let maxAESLength: Int = 1024 * 1024 * 1024
    private static let maxMetadataLength: Int = 1024 * 1024

    private static let combinedKeyInfo = Data("pastebin-hybrid-key-v1".utf8)
    private static let metadataKeyInfo = Data("pastebin-metadata-key-v1".utf8)

    public init() {}

    public func encrypt(
        plaintext: [UInt8],
        password: String,
        metadata: CryptoFileMetadata,
        encryptMetadata: Bool
    ) async throws -> EncryptionResult {
        let keyPair = Self.mlkem.GenerateKeyPair()
        let salt = try generateRandomBytes(count: Self.saltLength)
        let derivedKey = try deriveArgon2idKey(password: password, salt: salt)
        let encapsulated = keyPair.encap.Encapsulate()

        let combinedKey = deriveHKDFKey(
            ikm: derivedKey + encapsulated.K,
            salt: salt,
            info: Self.combinedKeyInfo
        )
        let aesCiphertext = try encryptAESCombined(plaintext: plaintext, key: combinedKey)

        let metadataJSON = try JSONEncoder().encode(metadata)
        let metadataBytes: [UInt8]
        if encryptMetadata {
            let metadataKey = deriveHKDFKey(
                ikm: derivedKey,
                salt: salt,
                info: Self.metadataKeyInfo
            )
            metadataBytes = try encryptAESCombined(plaintext: [UInt8](metadataJSON), key: metadataKey)
        } else {
            metadataBytes = [UInt8](metadataJSON)
        }

        let payload = SerializedPayload(
            version: CryptoEngine.payloadVersion,
            metadataEncrypted: encryptMetadata,
            salt: salt,
            kyberCiphertext: encapsulated.ct,
            aesCiphertext: aesCiphertext,
            metadata: metadataBytes
        )

        return EncryptionResult(
            serializedPayload: serialize(payload: payload),
            privateKeyBase64Url: encodeBase64URL(keyPair.decap.keyBytes)
        )
    }

    public func decrypt(
        serializedPayload: [UInt8],
        password: String,
        privateKeyBase64Url: String
    ) async throws -> DecryptionResult {
        let payload: SerializedPayload
        do {
            payload = try deserialize(payloadBytes: serializedPayload)
        } catch {
            throw NativeCryptoEngineError.invalidPayload
        }

        guard let privateKeyBytes = decodeBase64URL(privateKeyBase64Url) else {
            throw NativeCryptoEngineError.invalidKey
        }

        let decapsulationKey: DecapsulationKey
        do {
            decapsulationKey = try DecapsulationKey(keyBytes: privateKeyBytes)
        } catch {
            throw NativeCryptoEngineError.invalidKey
        }

        let sharedSecret: [UInt8]
        do {
            sharedSecret = try decapsulationKey.Decapsulate(ct: payload.kyberCiphertext)
        } catch {
            throw NativeCryptoEngineError.invalidKey
        }

        let derivedKey = try deriveArgon2idKey(password: password, salt: payload.salt)
        let combinedKey = deriveHKDFKey(
            ikm: derivedKey + sharedSecret,
            salt: payload.salt,
            info: Self.combinedKeyInfo
        )

        let plaintext: [UInt8]
        do {
            plaintext = try decryptAESCombined(combinedCiphertext: payload.aesCiphertext, key: combinedKey)
        } catch {
            throw NativeCryptoEngineError.invalidKey
        }

        let metadataBytes: [UInt8]
        do {
            if payload.metadataEncrypted {
                let metadataKey = deriveHKDFKey(
                    ikm: derivedKey,
                    salt: payload.salt,
                    info: Self.metadataKeyInfo
                )
                metadataBytes = try decryptAESCombined(
                    combinedCiphertext: payload.metadata,
                    key: metadataKey
                )
            } else {
                metadataBytes = payload.metadata
            }
        } catch {
            throw NativeCryptoEngineError.invalidPayload
        }

        let metadata: CryptoFileMetadata
        do {
            metadata = try JSONDecoder().decode(CryptoFileMetadata.self, from: Data(metadataBytes))
        } catch {
            throw NativeCryptoEngineError.invalidPayload
        }

        return DecryptionResult(plaintext: plaintext, metadata: metadata)
    }

    private func deriveArgon2idKey(password: String, salt: [UInt8]) throws -> [UInt8] {
        guard salt.count == Self.saltLength else {
            throw NativeCryptoEngineError.invalidPayload
        }

        let passwordBytes = [UInt8](password.utf8)
        var output = [UInt8](repeating: 0, count: Self.argonHashLength)

        let status = passwordBytes.withUnsafeBytes { passwordBuffer in
            salt.withUnsafeBytes { saltBuffer in
                output.withUnsafeMutableBytes { outputBuffer in
                    argon2id_hash_raw(
                        Self.argonIterations,
                        Self.argonMemoryKB,
                        Self.argonParallelism,
                        passwordBuffer.baseAddress,
                        passwordBuffer.count,
                        saltBuffer.baseAddress,
                        saltBuffer.count,
                        outputBuffer.baseAddress,
                        outputBuffer.count
                    )
                }
            }
        }

        guard status == Int32(ARGON2_OK.rawValue) else {
            throw NativeCryptoEngineError.invalidKey
        }
        return output
    }

    private func deriveHKDFKey(ikm: [UInt8], salt: [UInt8], info: Data) -> [UInt8] {
        let derived = HKDF<SHA256>.deriveKey(
            inputKeyMaterial: SymmetricKey(data: Data(ikm)),
            salt: Data(salt),
            info: info,
            outputByteCount: 32
        )
        return derived.withUnsafeBytes { [UInt8]($0) }
    }

    private func encryptAESCombined(plaintext: [UInt8], key: [UInt8]) throws -> [UInt8] {
        let symmetricKey = SymmetricKey(data: Data(key))
        let sealedBox = try AES.GCM.seal(Data(plaintext), using: symmetricKey)
        guard let combined = sealedBox.combined else {
            throw NativeCryptoEngineError.invalidPayload
        }
        return [UInt8](combined)
    }

    private func decryptAESCombined(combinedCiphertext: [UInt8], key: [UInt8]) throws -> [UInt8] {
        let symmetricKey = SymmetricKey(data: Data(key))
        let sealedBox = try AES.GCM.SealedBox(combined: Data(combinedCiphertext))
        let plaintext = try AES.GCM.open(sealedBox, using: symmetricKey)
        return [UInt8](plaintext)
    }

    private func generateRandomBytes(count: Int) throws -> [UInt8] {
        var bytes = [UInt8](repeating: 0, count: count)
        let status = SecRandomCopyBytes(kSecRandomDefault, count, &bytes)
        guard status == errSecSuccess else {
            throw NativeCryptoEngineError.invalidPayload
        }
        return bytes
    }

    private func serialize(payload: SerializedPayload) -> [UInt8] {
        let flags: UInt8 = payload.metadataEncrypted ? 0x01 : 0x00

        let totalSize =
            1 +
            1 +
            2 +
            payload.salt.count +
            2 +
            payload.kyberCiphertext.count +
            4 +
            payload.aesCiphertext.count +
            4 +
            payload.metadata.count

        var buffer = [UInt8](repeating: 0, count: totalSize)
        var offset = 0

        buffer[offset] = payload.version
        offset += 1

        buffer[offset] = flags
        offset += 1

        writeUInt16(UInt16(payload.salt.count), into: &buffer, at: &offset)
        writeBytes(payload.salt, into: &buffer, at: &offset)

        writeUInt16(UInt16(payload.kyberCiphertext.count), into: &buffer, at: &offset)
        writeBytes(payload.kyberCiphertext, into: &buffer, at: &offset)

        writeUInt32(UInt32(payload.aesCiphertext.count), into: &buffer, at: &offset)
        writeBytes(payload.aesCiphertext, into: &buffer, at: &offset)

        writeUInt32(UInt32(payload.metadata.count), into: &buffer, at: &offset)
        writeBytes(payload.metadata, into: &buffer, at: &offset)

        return buffer
    }

    private func deserialize(payloadBytes: [UInt8]) throws -> SerializedPayload {
        guard payloadBytes.count >= 14 else {
            throw NativeCryptoEngineError.invalidPayload
        }

        var offset = 0

        func safeRead(_ count: Int) throws -> [UInt8] {
            guard offset + count <= payloadBytes.count else {
                throw NativeCryptoEngineError.invalidPayload
            }
            let value = Array(payloadBytes[offset ..< offset + count])
            offset += count
            return value
        }

        func readUInt16() throws -> Int {
            let bytes = try safeRead(2)
            return (Int(bytes[0]) << 8) | Int(bytes[1])
        }

        func readUInt32() throws -> Int {
            let bytes = try safeRead(4)
            return
                (Int(bytes[0]) << 24) |
                (Int(bytes[1]) << 16) |
                (Int(bytes[2]) << 8) |
                Int(bytes[3])
        }

        let version = try safeRead(1)[0]
        guard version == CryptoEngine.payloadVersion else {
            throw NativeCryptoEngineError.invalidPayload
        }

        let flags = try safeRead(1)[0]
        let metadataEncrypted = (flags & 0x01) != 0

        let saltLength = try readUInt16()
        guard saltLength > 0 && saltLength <= 64 else {
            throw NativeCryptoEngineError.invalidPayload
        }
        let salt = try safeRead(saltLength)

        let kyberLength = try readUInt16()
        guard kyberLength == Self.expectedKyberCiphertextLength else {
            throw NativeCryptoEngineError.invalidPayload
        }
        let kyberCiphertext = try safeRead(kyberLength)

        let aesLength = try readUInt32()
        guard aesLength > 0 && aesLength <= Self.maxAESLength else {
            throw NativeCryptoEngineError.invalidPayload
        }
        let aesCiphertext = try safeRead(aesLength)

        let metadataLength = try readUInt32()
        guard metadataLength > 0 && metadataLength <= Self.maxMetadataLength else {
            throw NativeCryptoEngineError.invalidPayload
        }
        let metadata = try safeRead(metadataLength)

        guard offset == payloadBytes.count else {
            throw NativeCryptoEngineError.invalidPayload
        }

        return SerializedPayload(
            version: version,
            metadataEncrypted: metadataEncrypted,
            salt: salt,
            kyberCiphertext: kyberCiphertext,
            aesCiphertext: aesCiphertext,
            metadata: metadata
        )
    }

    private func writeUInt16(_ value: UInt16, into buffer: inout [UInt8], at offset: inout Int) {
        buffer[offset] = UInt8((value >> 8) & 0x00ff)
        buffer[offset + 1] = UInt8(value & 0x00ff)
        offset += 2
    }

    private func writeUInt32(_ value: UInt32, into buffer: inout [UInt8], at offset: inout Int) {
        buffer[offset] = UInt8((value >> 24) & 0x000000ff)
        buffer[offset + 1] = UInt8((value >> 16) & 0x000000ff)
        buffer[offset + 2] = UInt8((value >> 8) & 0x000000ff)
        buffer[offset + 3] = UInt8(value & 0x000000ff)
        offset += 4
    }

    private func writeBytes(_ bytes: [UInt8], into buffer: inout [UInt8], at offset: inout Int) {
        buffer.replaceSubrange(offset ..< offset + bytes.count, with: bytes)
        offset += bytes.count
    }

    private func encodeBase64URL(_ bytes: [UInt8]) -> String {
        Data(bytes)
            .base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private func decodeBase64URL(_ value: String) -> [UInt8]? {
        var base64 = value
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }
        guard let data = Data(base64Encoded: base64) else {
            return nil
        }
        return [UInt8](data)
    }
}
