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

/// Upload flow SwiftUI view-model interaction tests.
@MainActor
struct UploadFlowViewModelTests {
    @Test func fileModeUploadWithoutSelectionSetsValidationError() {
        let viewModel = makeUploadFlowViewModel()
        viewModel.inputMode = .file
        viewModel.password = "StrongPass#2026"

        viewModel.upload()

        #expect(viewModel.errorMessage == "Choose a file before uploading.")
        #expect(viewModel.isUploading == false)
    }

    @Test func successfulNoteUploadPublishesShareURL() async {
        let viewModel = makeUploadFlowViewModel(uploadID: "view-model-upload")
        viewModel.noteText = "hello from vm"
        viewModel.filename = "note-from-vm.txt"
        viewModel.password = "StrongPass#2026"

        viewModel.upload()
        #expect(viewModel.isUploading == true)

        await waitForUploadCompletion(viewModel: viewModel)

        #expect(viewModel.isUploading == false)
        #expect(
            viewModel.shareURLString ==
                "https://pastebin.sed.fyi/p/view-model-upload#private_key_fragment"
        )
        #expect(viewModel.errorMessage == nil)
    }

    @Test func handleFileImportSuccessPopulatesSelectionState() throws {
        let viewModel = makeUploadFlowViewModel()
        viewModel.inputMode = .file
        viewModel.password = "StrongPass#2026"

        let temporaryURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("upload-flow-import-test.txt")
        try Data("abc".utf8).write(to: temporaryURL, options: .atomic)
        defer { try? FileManager.default.removeItem(at: temporaryURL) }

        viewModel.handleFileImport(result: .success(temporaryURL))

        #expect(viewModel.selectedFileName == "upload-flow-import-test.txt")
        #expect(viewModel.selectedFileSizeBytes == 3)
        #expect(viewModel.canUpload == true)
        #expect(viewModel.errorMessage == nil)
    }
}

@MainActor
private func makeUploadFlowViewModel(uploadID: String = "file-123") -> UploadFlowViewModel {
    let service = UploadFeature(
        apiClient: FakeAPIClient(uploadResponse: .init(id: uploadID, expiresAt: 1_740_000_000_000)),
        cryptoEngine: FakeCryptoEngine(
            encryptionResult: .init(
                serializedPayload: [1, 2, 3, 4],
                privateKeyBase64Url: "private_key_fragment"
            )
        ),
        shareBaseURL: URL(string: "https://pastebin.sed.fyi")!,
        nowMillis: { 1_738_886_400_000 }
    )
    return UploadFlowViewModel(uploadService: service)
}

/// Waits until upload task completes and clears the uploading state.
@MainActor
private func waitForUploadCompletion(
    viewModel: UploadFlowViewModel,
    timeoutIterations: Int = 100,
    pollNanoseconds: UInt64 = 10_000_000
) async {
    for _ in 0..<timeoutIterations {
        if !viewModel.isUploading {
            return
        }
        try? await Task.sleep(nanoseconds: pollNanoseconds)
    }
    Issue.record("UploadFlowViewModel did not finish upload within timeout.")
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
