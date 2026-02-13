/// Core cryptography interfaces for native Apple clients.
///
/// This module will implement the production-compatible encryption contract
/// documented in `design-docs/native-swift-kotlin-architecture.md`.
import Foundation

/// Current cryptographic payload version supported by native clients.
public enum CryptoEngine {
    public static let payloadVersion: UInt8 = 1
}

/// Metadata attached to encrypted payloads.
public struct CryptoFileMetadata: Codable, Sendable, Equatable {
    public struct EncryptionConfig: Codable, Sendable, Equatable {
        public let encryptMetadata: Bool
        public let algorithm: String

        public init(encryptMetadata: Bool, algorithm: String) {
            self.encryptMetadata = encryptMetadata
            self.algorithm = algorithm
        }
    }

    public let name: String
    public let size: Int
    public let mimeType: String
    public let uploadDate: Int64
    public let expirationDate: Int64?
    public let encryptionConfig: EncryptionConfig

    public init(
        name: String,
        size: Int,
        mimeType: String,
        uploadDate: Int64,
        expirationDate: Int64?,
        encryptionConfig: EncryptionConfig
    ) {
        self.name = name
        self.size = size
        self.mimeType = mimeType
        self.uploadDate = uploadDate
        self.expirationDate = expirationDate
        self.encryptionConfig = encryptionConfig
    }
}

/// Result of encrypting plaintext for upload.
public struct EncryptionResult: Sendable, Equatable {
    /// Serialized binary payload for `/api/v1/upload`.
    public let serializedPayload: [UInt8]
    /// Base64url private key fragment appended to `#`.
    public let privateKeyBase64Url: String

    public init(serializedPayload: [UInt8], privateKeyBase64Url: String) {
        self.serializedPayload = serializedPayload
        self.privateKeyBase64Url = privateKeyBase64Url
    }
}

/// Result of decrypting downloaded encrypted payload bytes.
public struct DecryptionResult: Sendable, Equatable {
    public let plaintext: [UInt8]
    public let metadata: CryptoFileMetadata

    public init(plaintext: [UInt8], metadata: CryptoFileMetadata) {
        self.plaintext = plaintext
        self.metadata = metadata
    }
}

/// Contract implemented by platform-specific crypto engines.
public protocol NativeCryptoEngine {
    /// Encrypts plaintext and returns serialized payload + private key fragment.
    func encrypt(
        plaintext: [UInt8],
        password: String,
        metadata: CryptoFileMetadata,
        encryptMetadata: Bool
    ) async throws -> EncryptionResult

    /// Decrypts a serialized payload using password + private key fragment.
    func decrypt(
        serializedPayload: [UInt8],
        password: String,
        privateKeyBase64Url: String
    ) async throws -> DecryptionResult
}

/// Shared crypto-interface errors.
public enum NativeCryptoEngineError: Error, Sendable, Equatable, LocalizedError {
    case notImplemented
    case invalidPayload
    case invalidKey

    public var errorDescription: String? {
        switch self {
        case .notImplemented:
            return "Native crypto engine implementation is not available yet."
        case .invalidPayload:
            return "Encrypted payload is invalid."
        case .invalidKey:
            return "Private key fragment is invalid."
        }
    }
}

/// Temporary placeholder implementation used before production crypto integration.
public struct UnimplementedNativeCryptoEngine: NativeCryptoEngine {
    public init() {}

    public func encrypt(
        plaintext: [UInt8],
        password: String,
        metadata: CryptoFileMetadata,
        encryptMetadata: Bool
    ) async throws -> EncryptionResult {
        _ = plaintext
        _ = password
        _ = metadata
        _ = encryptMetadata
        throw NativeCryptoEngineError.notImplemented
    }

    public func decrypt(
        serializedPayload: [UInt8],
        password: String,
        privateKeyBase64Url: String
    ) async throws -> DecryptionResult {
        _ = serializedPayload
        _ = password
        _ = privateKeyBase64Url
        throw NativeCryptoEngineError.notImplemented
    }
}
