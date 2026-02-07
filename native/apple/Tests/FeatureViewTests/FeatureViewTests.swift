import Foundation
import Testing
@testable import FeatureView
import CoreCrypto
import CoreNetworking

/// Decrypt flow orchestration tests with fake dependencies.
struct FeatureViewTests {
    @Test func decryptParsesLinkDownloadsPayloadAndDecrypts() async throws {
        let expectedMetadata = CryptoFileMetadata(
            name: "vector.txt",
            size: 2,
            mimeType: "text/plain",
            uploadDate: 1,
            expirationDate: nil,
            encryptionConfig: .init(encryptMetadata: false, algorithm: "Kyber768+AES256-GCM")
        )

        let fakeAPI = FakeAPIClient(downloadResponse: .init(data: [9, 9, 9]))
        let fakeCrypto = FakeCryptoEngine(
            decryptionResult: .init(
                plaintext: [72, 73],
                metadata: expectedMetadata
            )
        )

        let service = ViewFeature(apiClient: fakeAPI, cryptoEngine: fakeCrypto)
        let result = try await service.decrypt(
            .init(
                shareURL: URL(string: "https://pastebin.sed.fyi/p/file-abc#key_fragment")!,
                password: "StrongPass#2026"
            )
        )

        #expect(result.id == "file-abc")
        #expect(result.plaintext == [72, 73])
        #expect(result.metadata == expectedMetadata)
        #expect(fakeAPI.downloadedID == "file-abc")
        #expect(fakeCrypto.capturedPrivateKey == "key_fragment")
    }
}

private final class FakeAPIClient: APIClient {
    let downloadResponse: DownloadResponse
    var downloadedID: String?

    init(downloadResponse: DownloadResponse) {
        self.downloadResponse = downloadResponse
    }

    func uploadEncryptedBlob(data: [UInt8], filename: String) async throws -> UploadResponse {
        _ = data
        _ = filename
        return UploadResponse(id: "unused", expiresAt: 0)
    }

    func downloadEncryptedBlob(id: String) async throws -> DownloadResponse {
        downloadedID = id
        return downloadResponse
    }

    func health() async throws -> HealthResponse {
        HealthResponse(configured: true, account: nil)
    }
}

private final class FakeCryptoEngine: NativeCryptoEngine {
    let decryptionResult: DecryptionResult
    var capturedPrivateKey: String?

    init(decryptionResult: DecryptionResult) {
        self.decryptionResult = decryptionResult
    }

    func encrypt(
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

    func decrypt(
        serializedPayload: [UInt8],
        password: String,
        privateKeyBase64Url: String
    ) async throws -> DecryptionResult {
        _ = serializedPayload
        _ = password
        capturedPrivateKey = privateKeyBase64Url
        return decryptionResult
    }
}
