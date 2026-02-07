import Foundation
import Testing
@testable import FeatureUpload
import CoreCrypto
import CoreNetworking

/// Upload flow orchestration tests with fake dependencies.
struct FeatureUploadTests {
    @Test func uploadBuildsShareLinkAndUsesEncryptedFilenameWhenMetadataEncrypted() async throws {
        let fakeAPI = FakeAPIClient(uploadResponse: .init(id: "file-123", expiresAt: 1_740_000_000_000))
        let fakeCrypto = FakeCryptoEngine(
            encryptionResult: .init(
                serializedPayload: [1, 2, 3, 4],
                privateKeyBase64Url: "private_key_fragment"
            )
        )

        let service = UploadFeature(
            apiClient: fakeAPI,
            cryptoEngine: fakeCrypto,
            shareBaseURL: URL(string: "https://pastebin.sed.fyi")!,
            nowMillis: { 1_738_886_400_000 }
        )

        let result = try await service.upload(
            .init(
                plaintext: [72, 73],
                filename: "secret.txt",
                mimeType: "text/plain",
                password: "StrongPass#2026",
                encryptMetadata: true
            )
        )

        #expect(result.id == "file-123")
        #expect(result.privateKeyBase64Url == "private_key_fragment")
        #expect(result.shareURL.absoluteString == "https://pastebin.sed.fyi/p/file-123#private_key_fragment")

        #expect(fakeAPI.uploadedFilename == "encrypted")
        #expect(fakeAPI.uploadedData == [1, 2, 3, 4])
        #expect(fakeCrypto.capturedPassword == "StrongPass#2026")
    }
}

private final class FakeAPIClient: APIClient {
    let uploadResponse: UploadResponse
    var uploadedData: [UInt8] = []
    var uploadedFilename: String = ""

    init(uploadResponse: UploadResponse) {
        self.uploadResponse = uploadResponse
    }

    func uploadEncryptedBlob(data: [UInt8], filename: String) async throws -> UploadResponse {
        uploadedData = data
        uploadedFilename = filename
        return uploadResponse
    }

    func downloadEncryptedBlob(id: String) async throws -> DownloadResponse {
        _ = id
        return DownloadResponse(data: [])
    }

    func health() async throws -> HealthResponse {
        HealthResponse(configured: true, account: nil)
    }
}

private final class FakeCryptoEngine: NativeCryptoEngine {
    let encryptionResult: EncryptionResult
    var capturedPassword: String?

    init(encryptionResult: EncryptionResult) {
        self.encryptionResult = encryptionResult
    }

    func encrypt(
        plaintext: [UInt8],
        password: String,
        metadata: CryptoFileMetadata,
        encryptMetadata: Bool
    ) async throws -> EncryptionResult {
        _ = plaintext
        _ = metadata
        _ = encryptMetadata
        capturedPassword = password
        return encryptionResult
    }

    func decrypt(
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
