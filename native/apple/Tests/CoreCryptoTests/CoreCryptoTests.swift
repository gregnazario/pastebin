import Testing
@testable import CoreCrypto

/// Basic smoke tests for CoreCrypto module bootstrap.
struct CoreCryptoTests {
    @Test func payloadVersionIsV1() {
        #expect(CryptoEngine.payloadVersion == 1)
    }

    @Test func productionCryptoEngineRoundTripsPayload() async throws {
        let engine = ProductionNativeCryptoEngine()
        let metadata = CryptoFileMetadata(
            name: "note.txt",
            size: 2,
            mimeType: "text/plain",
            uploadDate: 1_738_886_400_000,
            expirationDate: nil,
            encryptionConfig: .init(encryptMetadata: true, algorithm: "Kyber768+AES256-GCM")
        )

        let encrypted = try await engine.encrypt(
            plaintext: [72, 73],
            password: "StrongPass#2026",
            metadata: metadata,
            encryptMetadata: true
        )

        let decrypted = try await engine.decrypt(
            serializedPayload: encrypted.serializedPayload,
            password: "StrongPass#2026",
            privateKeyBase64Url: encrypted.privateKeyBase64Url
        )

        #expect(decrypted.plaintext == [72, 73])
        #expect(decrypted.metadata == metadata)
    }
}
