/// Networking abstractions and concrete client for Secure Pastebin native API v1.
import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// API contract for Secure Pastebin native calls.
public protocol APIClient {
    /// Executes an upload request against `/api/v1/upload`.
    func uploadEncryptedBlob(data: [UInt8], filename: String) async throws -> UploadResponse

    /// Executes a download request against `/api/v1/download`.
    func downloadEncryptedBlob(id: String) async throws -> DownloadResponse

    /// Checks `/api/v1/health`.
    func health() async throws -> HealthResponse
}

/// Upload response payload for `/api/v1/upload`.
public struct UploadResponse: Decodable, Sendable, Equatable {
    public let id: String
    public let expiresAt: Int64
}

/// Download response payload for `/api/v1/download`.
public struct DownloadResponse: Decodable, Sendable, Equatable {
    public let data: [UInt8]
}

/// Health response payload for `/api/v1/health`.
public struct HealthResponse: Decodable, Sendable, Equatable {
    public let configured: Bool
    public let account: String?
}

private struct UploadRequest: Encodable {
    let data: [UInt8]
    let filename: String
}

private struct ErrorResponse: Decodable {
    let error: String
}

/// Errors returned by the API client.
public enum APIClientError: Error, Sendable, LocalizedError, Equatable {
    case invalidBaseURL
    case transport(String)
    case invalidHTTPResponse
    case decodeFailed(String)
    case server(statusCode: Int, message: String)

    public var errorDescription: String? {
        switch self {
        case .invalidBaseURL:
            return "Invalid API base URL"
        case .transport(let message):
            return "Network transport failed: \(message)"
        case .invalidHTTPResponse:
            return "Invalid HTTP response"
        case .decodeFailed(let message):
            return "Failed to decode API response: \(message)"
        case .server(let statusCode, let message):
            return "Server error \(statusCode): \(message)"
        }
    }
}

/// Configuration for URLSession-backed API calls.
public struct APIClientConfiguration: Sendable, Equatable {
    public let baseURL: URL
    public let timeoutSeconds: TimeInterval
    public let defaultHeaders: [String: String]

    public init(
        baseURL: URL,
        timeoutSeconds: TimeInterval = 30,
        defaultHeaders: [String: String] = [:]
    ) {
        self.baseURL = baseURL
        self.timeoutSeconds = timeoutSeconds
        self.defaultHeaders = defaultHeaders
    }
}

/// Concrete URLSession implementation of API v1.
public final class URLSessionAPIClient: APIClient {
    private let configuration: APIClientConfiguration
    private let session: URLSession
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    public init(
        configuration: APIClientConfiguration,
        session: URLSession = .shared
    ) {
        self.configuration = configuration
        self.session = session
    }

    public func uploadEncryptedBlob(data: [UInt8], filename: String) async throws -> UploadResponse {
        let payload = UploadRequest(data: data, filename: filename)
        return try await performRequest(
            method: "POST",
            path: "/api/v1/upload",
            body: payload
        )
    }

    public func downloadEncryptedBlob(id: String) async throws -> DownloadResponse {
        let escapedId = id.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? id
        return try await performRequest(
            method: "GET",
            path: "/api/v1/download?id=\(escapedId)",
            body: Optional<Int>.none
        )
    }

    public func health() async throws -> HealthResponse {
        try await performRequest(
            method: "GET",
            path: "/api/v1/health",
            body: Optional<Int>.none
        )
    }

    private func performRequest<RequestBody: Encodable, ResponseBody: Decodable>(
        method: String,
        path: String,
        body: RequestBody?
    ) async throws -> ResponseBody {
        let url = try makeURL(path: path)
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = configuration.timeoutSeconds
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        for (header, value) in configuration.defaultHeaders {
            request.setValue(value, forHTTPHeaderField: header)
        }

        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try encoder.encode(body)
        }

        let rawData: Data
        let rawResponse: URLResponse
        do {
            (rawData, rawResponse) = try await session.data(for: request)
        } catch {
            throw APIClientError.transport(error.localizedDescription)
        }

        guard let response = rawResponse as? HTTPURLResponse else {
            throw APIClientError.invalidHTTPResponse
        }

        guard (200...299).contains(response.statusCode) else {
            let message = decodeServerError(data: rawData)
            throw APIClientError.server(statusCode: response.statusCode, message: message)
        }

        do {
            return try decoder.decode(ResponseBody.self, from: rawData)
        } catch {
            throw APIClientError.decodeFailed(error.localizedDescription)
        }
    }

    private func makeURL(path: String) throws -> URL {
        guard var components = URLComponents(
            url: configuration.baseURL,
            resolvingAgainstBaseURL: false
        ) else {
            throw APIClientError.invalidBaseURL
        }

        let safePath = path.hasPrefix("/") ? path : "/\(path)"
        let pathAndQuery = safePath.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)
        let requestPath = String(pathAndQuery[0])

        let normalizedBasePath = components.path.hasSuffix("/")
            ? String(components.path.dropLast())
            : components.path
        components.path = normalizedBasePath + requestPath

        if pathAndQuery.count > 1 {
            components.percentEncodedQuery = String(pathAndQuery[1])
        }

        guard let url = components.url else {
            throw APIClientError.invalidBaseURL
        }

        return url
    }

    private func decodeServerError(data: Data) -> String {
        if let decoded = try? decoder.decode(ErrorResponse.self, from: data) {
            return decoded.error
        }
        if let text = String(data: data, encoding: .utf8), !text.isEmpty {
            return text
        }
        return "Unknown server error"
    }
}
