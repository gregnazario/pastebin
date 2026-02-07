import Foundation
import Testing
@testable import CoreNetworking

/// Smoke tests for CoreNetworking configuration behavior.
struct CoreNetworkingTests {
    @Test func configurationDefaultsAreStable() throws {
        let config = APIClientConfiguration(baseURL: URL(string: "https://example.com")!)
        #expect(config.timeoutSeconds == 30)
        #expect(config.defaultHeaders.isEmpty)
    }
}
