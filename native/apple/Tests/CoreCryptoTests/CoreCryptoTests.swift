import Testing
@testable import CoreCrypto

/// Basic smoke tests for CoreCrypto module bootstrap.
struct CoreCryptoTests {
    @Test func payloadVersionIsV1() {
        #expect(CryptoEngine.payloadVersion == 1)
    }

    @Test func developmentCryptoEngineRoundTripsPayload() async throws {
        let engine = DevelopmentNativeCryptoEngine()
        let metadata = CryptoFileMetadata(
            name: "note.txt",
            size: 2,
            mimeType: "text/plain",
            uploadDate: 1_738_886_400_000,
            expirationDate: nil,
            encryptionConfig: .init(encryptMetadata: false, algorithm: "dev-only")
        )

        let encrypted = try await engine.encrypt(
            plaintext: [72, 73],
            password: "DevPass#1",
            metadata: metadata,
            encryptMetadata: false
        )

        let decrypted = try await engine.decrypt(
            serializedPayload: encrypted.serializedPayload,
            password: "DevPass#1",
            privateKeyBase64Url: encrypted.privateKeyBase64Url
        )

        #expect(decrypted.plaintext == [72, 73])
        #expect(decrypted.metadata == metadata)
    }
}
