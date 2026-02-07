/// Development-only crypto engine for end-to-end UI flow wiring.
///
/// IMPORTANT:
/// This implementation is intentionally non-production and is only used to
/// unblock native feature flow integration before full cryptography parity
/// (ML-KEM + AES + Argon2id) is completed.
import CryptoKit
import Foundation

private struct DevelopmentEnvelope: Codable {
    let version: UInt8
    let privateKeyBase64Url: String
    let passwordHashHex: String
    let metadata: CryptoFileMetadata
    let plaintextBase64Url: String
}

/// Non-production crypto adapter used for development flow testing.
public struct DevelopmentNativeCryptoEngine: NativeCryptoEngine {
    public init() {}

    public func encrypt(
        plaintext: [UInt8],
        password: String,
        metadata: CryptoFileMetadata,
        encryptMetadata: Bool
    ) async throws -> EncryptionResult {
        _ = encryptMetadata

        let privateKey = generateDevelopmentKey()
        let envelope = DevelopmentEnvelope(
            version: CryptoEngine.payloadVersion,
            privateKeyBase64Url: privateKey,
            passwordHashHex: passwordHashHex(password),
            metadata: metadata,
            plaintextBase64Url: encodeBase64URL(plaintext)
        )

        let encoded = try JSONEncoder().encode(envelope)
        return EncryptionResult(
            serializedPayload: [UInt8](encoded),
            privateKeyBase64Url: privateKey
        )
    }

    public func decrypt(
        serializedPayload: [UInt8],
        password: String,
        privateKeyBase64Url: String
    ) async throws -> DecryptionResult {
        let payloadData = Data(serializedPayload)
        let envelope: DevelopmentEnvelope
        do {
            envelope = try JSONDecoder().decode(DevelopmentEnvelope.self, from: payloadData)
        } catch {
            throw NativeCryptoEngineError.invalidPayload
        }

        guard envelope.version == CryptoEngine.payloadVersion else {
            throw NativeCryptoEngineError.invalidPayload
        }
        guard envelope.privateKeyBase64Url == privateKeyBase64Url else {
            throw NativeCryptoEngineError.invalidKey
        }
        guard envelope.passwordHashHex == passwordHashHex(password) else {
            throw NativeCryptoEngineError.invalidKey
        }

        guard let plaintext = decodeBase64URL(envelope.plaintextBase64Url) else {
            throw NativeCryptoEngineError.invalidPayload
        }

        return DecryptionResult(
            plaintext: plaintext,
            metadata: envelope.metadata
        )
    }

    private func generateDevelopmentKey() -> String {
        UUID().uuidString.replacingOccurrences(of: "-", with: "")
    }

    private func passwordHashHex(_ password: String) -> String {
        let digest = SHA256.hash(data: Data(password.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
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
