import Testing
@testable import CoreCrypto

/// Basic smoke tests for CoreCrypto module bootstrap.
struct CoreCryptoTests {
    @Test func payloadVersionIsV1() {
        #expect(CryptoEngine.payloadVersion == 1)
    }
}
