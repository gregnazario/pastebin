import Foundation
import Testing
@testable import CoreNetworking
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Smoke tests for CoreNetworking configuration behavior.
struct CoreNetworkingTests {
    @Test func configurationDefaultsAreStable() throws {
        let config = APIClientConfiguration(baseURL: URL(string: "https://example.com")!)
        #expect(config.timeoutSeconds == 30)
        #expect(config.defaultHeaders.isEmpty)
    }

    @Test func healthRequestIncludesObservabilityHeaders() async throws {
        HeaderCaptureURLProtocol.lastRequest = nil
        HeaderCaptureURLProtocol.responseData = Data(#"{"configured":true,"account":null}"#.utf8)
        HeaderCaptureURLProtocol.responseStatusCode = 200

        let sessionConfiguration = URLSessionConfiguration.ephemeral
        sessionConfiguration.protocolClasses = [HeaderCaptureURLProtocol.self]
        let session = URLSession(configuration: sessionConfiguration)

        let client = URLSessionAPIClient(
            configuration: APIClientConfiguration(baseURL: URL(string: "https://example.com")!),
            session: session,
            clientPlatform: "ios",
            clientVersion: "0.1.0-test",
            requestIDProvider: { "request-id-123" }
        )

        _ = try await client.health()
        let request = try #require(HeaderCaptureURLProtocol.lastRequest)
        #expect(request.value(forHTTPHeaderField: "Accept") == "*/*")
        #expect(request.value(forHTTPHeaderField: "X-Client-Platform") == "ios")
        #expect(request.value(forHTTPHeaderField: "X-Client-Version") == "0.1.0-test")
        #expect(request.value(forHTTPHeaderField: "X-Request-Id") == "request-id-123")
    }
}

/// URLProtocol test double that records outgoing request headers.
private final class HeaderCaptureURLProtocol: URLProtocol {
    static var lastRequest: URLRequest?
    static var responseStatusCode = 200
    static var responseData = Data()

    override class func canInit(with request: URLRequest) -> Bool {
        true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        HeaderCaptureURLProtocol.lastRequest = request
        let response = HTTPURLResponse(
            url: request.url!,
            statusCode: HeaderCaptureURLProtocol.responseStatusCode,
            httpVersion: nil,
            headerFields: ["Content-Type": "application/json"]
        )!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: HeaderCaptureURLProtocol.responseData)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}
