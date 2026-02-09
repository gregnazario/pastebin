import Foundation
import Testing
@testable import FeatureView
import CoreCrypto
import CoreNetworking
import CoreStorage

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
        let historyStore = FakeHistoryStore()

        let service = ViewFeature(
            apiClient: fakeAPI,
            cryptoEngine: fakeCrypto,
            historyStore: historyStore,
            nowMillis: { 1234 }
        )
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
        let entries = try await historyStore.list()
        #expect(entries.count == 1)
        #expect(entries.first?.id == "file-abc")
        #expect(entries.first?.fileName == "vector.txt")
        #expect(entries.first?.createdAtMillis == 1234)
        #expect(entries.first?.expiresAtMillis == 0)
    }
}

/// Decrypt SwiftUI view-model interaction tests.
@MainActor
struct DecryptFlowViewModelTests {
    @Test func prefillShareURLUpdatesFieldAndClearsError() {
        let viewModel = makeDecryptFlowViewModel()
        viewModel.errorMessage = "Old error"
        let prefillURL = URL(string: "https://pastebin.sed.fyi/p/file-prefill#key")!

        viewModel.prefillShareURL(prefillURL)

        #expect(viewModel.shareURLString == prefillURL.absoluteString)
        #expect(viewModel.errorMessage == nil)
    }

    @Test func startSaveAsWithoutDecryptShowsValidationError() {
        let viewModel = makeDecryptFlowViewModel()

        viewModel.startSaveAs()

        #expect(viewModel.errorMessage == "Decrypt a file before saving.")
        #expect(viewModel.isFileExporterPresented == false)
    }

    @Test func decryptWithInvalidURLShowsErrorAndStopsBusyState() async {
        let viewModel = makeDecryptFlowViewModel()
        viewModel.shareURLString = "https://[bad"
        viewModel.password = "StrongPass#2026"

        viewModel.decrypt()
        #expect(viewModel.isDecrypting == true)

        await waitForDecryptCompletion(viewModel: viewModel)

        #expect(viewModel.isDecrypting == false)
        #expect(viewModel.errorMessage == "Share URL is invalid.")
    }

    @Test func decryptWithoutKeyFragmentShowsErrorAndStopsBusyState() async {
        let viewModel = makeDecryptFlowViewModel()
        viewModel.shareURLString = "https://pastebin.sed.fyi/p/file-no-fragment"
        viewModel.password = "StrongPass#2026"

        viewModel.decrypt()
        #expect(viewModel.isDecrypting == true)

        await waitForDecryptCompletion(viewModel: viewModel)

        #expect(viewModel.isDecrypting == false)
        #expect(viewModel.errorMessage == "Share URL does not include a private key fragment.")
    }

    @Test func decryptSuccessEnablesExportAndSaveAsActions() async {
        let viewModel = makeDecryptFlowViewModel()
        viewModel.shareURLString = "https://pastebin.sed.fyi/p/file-abc#key_fragment"
        viewModel.password = "StrongPass#2026"

        viewModel.decrypt()
        await waitForDecryptCompletion(viewModel: viewModel)

        #expect(viewModel.errorMessage == nil)
        #expect(viewModel.hasDecryptedFile == true)
        #expect(viewModel.shareExportURL != nil)

        viewModel.startSaveAs()
        #expect(viewModel.isFileExporterPresented == true)
        #expect(viewModel.exportDocument != nil)
    }
}

@MainActor
private func makeDecryptFlowViewModel() -> DecryptFlowViewModel {
    let viewService = ViewFeature(
        apiClient: FakeAPIClient(downloadResponse: .init(data: [9, 9, 9])),
        cryptoEngine: FakeCryptoEngine(
            decryptionResult: .init(
                plaintext: [72, 73],
                metadata: .init(
                    name: "vector.txt",
                    size: 2,
                    mimeType: "text/plain",
                    uploadDate: 1,
                    expirationDate: nil,
                    encryptionConfig: .init(encryptMetadata: false, algorithm: "Kyber768+AES256-GCM")
                )
            )
        ),
        historyStore: nil,
        nowMillis: { 1234 }
    )
    return DecryptFlowViewModel(viewService: viewService)
}

/// Waits until decrypt task completes and clears the decrypting state.
@MainActor
private func waitForDecryptCompletion(
    viewModel: DecryptFlowViewModel,
    timeoutIterations: Int = 100,
    pollNanoseconds: UInt64 = 10_000_000
) async {
    for _ in 0..<timeoutIterations {
        if !viewModel.isDecrypting {
            return
        }
        try? await Task.sleep(nanoseconds: pollNanoseconds)
    }
    Issue.record("DecryptFlowViewModel did not finish decrypt within timeout.")
}

private actor FakeHistoryStore: HistoryStore {
    var upsertedEntries: [HistoryEntry] = []

    func upsert(_ entry: HistoryEntry) async throws {
        upsertedEntries.append(entry)
    }

    func list() async throws -> [HistoryEntry] {
        upsertedEntries
    }

    func delete(id: String) async throws {
        upsertedEntries.removeAll(where: { $0.id == id })
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
