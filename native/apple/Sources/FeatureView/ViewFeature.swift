/// View/decrypt feature orchestration for native Apple clients.
import CoreCrypto
import CoreNetworking
import CoreStorage
import Foundation

/// Input model for decrypt orchestration.
public struct DecryptRequest: Sendable, Equatable {
    public let shareURL: URL
    public let password: String

    public init(shareURL: URL, password: String) {
        self.shareURL = shareURL
        self.password = password
    }
}

/// Result model for decrypt orchestration.
public struct DecryptResult: Sendable, Equatable {
    public let id: String
    public let plaintext: [UInt8]
    public let metadata: CryptoFileMetadata

    public init(id: String, plaintext: [UInt8], metadata: CryptoFileMetadata) {
        self.id = id
        self.plaintext = plaintext
        self.metadata = metadata
    }
}

/// Errors returned by share-link parsing or decrypt orchestration.
public enum DecryptServiceError: Error, Sendable, Equatable, LocalizedError {
    case invalidShareURL
    case missingFileID
    case missingKeyFragment

    public var errorDescription: String? {
        switch self {
        case .invalidShareURL:
            return "Share URL is invalid."
        case .missingFileID:
            return "Share URL does not contain a file ID."
        case .missingKeyFragment:
            return "Share URL does not include a private key fragment."
        }
    }
}

/// View feature service coordinating download + decrypt.
public struct ViewFeature {
    private let apiClient: APIClient
    private let cryptoEngine: NativeCryptoEngine
    private let historyStore: HistoryStore?
    private let nowMillis: @Sendable () -> Int64

    public init(
        apiClient: APIClient,
        cryptoEngine: NativeCryptoEngine,
        historyStore: HistoryStore? = nil,
        nowMillis: @escaping @Sendable () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1000) }
    ) {
        self.apiClient = apiClient
        self.cryptoEngine = cryptoEngine
        self.historyStore = historyStore
        self.nowMillis = nowMillis
    }

    /// Downloads encrypted payload and decrypts it using URL fragment key + password.
    public func decrypt(_ request: DecryptRequest) async throws -> DecryptResult {
        let parsed = try parseShareURL(request.shareURL)
        let download = try await apiClient.downloadEncryptedBlob(id: parsed.id)
        let decrypted = try await cryptoEngine.decrypt(
            serializedPayload: download.data,
            password: request.password,
            privateKeyBase64Url: parsed.privateKeyBase64Url
        )

        let result = DecryptResult(
            id: parsed.id,
            plaintext: decrypted.plaintext,
            metadata: decrypted.metadata
        )

        if let historyStore {
            let entry = HistoryEntry(
                id: parsed.id,
                fileName: decrypted.metadata.name,
                createdAtMillis: nowMillis(),
                expiresAtMillis: decrypted.metadata.expirationDate ?? 0
            )
            try? await historyStore.upsert(entry)
        }

        return result
    }

    private func parseShareURL(_ url: URL) throws -> (id: String, privateKeyBase64Url: String) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            throw DecryptServiceError.invalidShareURL
        }

        let id = extractFileID(path: components.path)
        guard let id, !id.isEmpty else {
            throw DecryptServiceError.missingFileID
        }

        guard let fragment = components.percentEncodedFragment, !fragment.isEmpty else {
            throw DecryptServiceError.missingKeyFragment
        }

        return (id: id, privateKeyBase64Url: fragment)
    }

    private func extractFileID(path: String) -> String? {
        let marker = "/p/"
        guard let range = path.range(of: marker, options: .backwards) else {
            return nil
        }

        let rawID = String(path[range.upperBound...])
        guard !rawID.isEmpty else {
            return nil
        }

        return rawID.removingPercentEncoding ?? rawID
    }
}
