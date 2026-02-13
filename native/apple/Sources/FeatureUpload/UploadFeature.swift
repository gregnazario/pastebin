/// Upload feature orchestration for native Apple clients.
import CoreCrypto
import CoreNetworking
import Foundation

/// Input model for upload orchestration.
public struct UploadRequest: Sendable, Equatable {
    public let plaintext: [UInt8]
    public let filename: String
    public let mimeType: String
    public let password: String
    public let encryptMetadata: Bool

    public init(
        plaintext: [UInt8],
        filename: String,
        mimeType: String,
        password: String,
        encryptMetadata: Bool
    ) {
        self.plaintext = plaintext
        self.filename = filename
        self.mimeType = mimeType
        self.password = password
        self.encryptMetadata = encryptMetadata
    }
}

/// Result model for successful upload orchestration.
public struct UploadResult: Sendable, Equatable {
    public let id: String
    public let expiresAt: Int64
    public let shareURL: URL
    public let privateKeyBase64Url: String

    public init(
        id: String,
        expiresAt: Int64,
        shareURL: URL,
        privateKeyBase64Url: String
    ) {
        self.id = id
        self.expiresAt = expiresAt
        self.shareURL = shareURL
        self.privateKeyBase64Url = privateKeyBase64Url
    }
}

/// Upload service error types.
public enum UploadServiceError: Error, Sendable, Equatable, LocalizedError {
    case invalidShareBaseURL

    public var errorDescription: String? {
        switch self {
        case .invalidShareBaseURL:
            return "Share base URL is invalid."
        }
    }
}

/// Upload feature service coordinating crypto and API upload.
public struct UploadFeature {
    private let apiClient: APIClient
    private let cryptoEngine: NativeCryptoEngine
    private let shareBaseURL: URL
    private let nowMillis: @Sendable () -> Int64

    public init(
        apiClient: APIClient,
        cryptoEngine: NativeCryptoEngine,
        shareBaseURL: URL,
        nowMillis: @escaping @Sendable () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1000) }
    ) {
        self.apiClient = apiClient
        self.cryptoEngine = cryptoEngine
        self.shareBaseURL = shareBaseURL
        self.nowMillis = nowMillis
    }

    /// Encrypts plaintext, uploads serialized payload, and returns share URL.
    public func upload(_ request: UploadRequest) async throws -> UploadResult {
        let metadata = CryptoFileMetadata(
            name: request.filename,
            size: request.plaintext.count,
            mimeType: request.mimeType,
            uploadDate: nowMillis(),
            expirationDate: nil,
            encryptionConfig: .init(
                encryptMetadata: request.encryptMetadata,
                algorithm: "Kyber768+AES256-GCM"
            )
        )

        let encryption = try await cryptoEngine.encrypt(
            plaintext: request.plaintext,
            password: request.password,
            metadata: metadata,
            encryptMetadata: request.encryptMetadata
        )

        let uploadFilename = request.encryptMetadata ? "encrypted" : request.filename
        let uploadResponse = try await apiClient.uploadEncryptedBlob(
            data: encryption.serializedPayload,
            filename: uploadFilename
        )

        let shareURL = try buildShareURL(
            baseURL: shareBaseURL,
            id: uploadResponse.id,
            privateKeyBase64Url: encryption.privateKeyBase64Url
        )

        return UploadResult(
            id: uploadResponse.id,
            expiresAt: uploadResponse.expiresAt,
            shareURL: shareURL,
            privateKeyBase64Url: encryption.privateKeyBase64Url
        )
    }

    private func buildShareURL(
        baseURL: URL,
        id: String,
        privateKeyBase64Url: String
    ) throws -> URL {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            throw UploadServiceError.invalidShareBaseURL
        }

        let normalizedPath = components.path.hasSuffix("/")
            ? String(components.path.dropLast())
            : components.path
        let escapedID = id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? id
        components.path = "\(normalizedPath)/p/\(escapedID)"
        components.percentEncodedFragment = privateKeyBase64Url

        guard let url = components.url else {
            throw UploadServiceError.invalidShareBaseURL
        }

        return url
    }
}
