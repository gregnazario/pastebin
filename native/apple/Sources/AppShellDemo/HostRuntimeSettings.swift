/// Host runtime settings helper for deterministic API-base apply/rebuild behavior.
import Foundation

/// Pure state model used by app-shell settings apply logic.
public struct HostRuntimeSettingsState: Equatable, Sendable {
    public let apiBaseURLString: String
    public let rebuildToken: Int

    public init(apiBaseURLString: String, rebuildToken: Int = 0) {
        self.apiBaseURLString = apiBaseURLString
        self.rebuildToken = rebuildToken
    }

    /// Applies a new API base URL and increments rebuild token for host-view refresh.
    public func applying(apiBaseURLString updatedValue: String) -> HostRuntimeSettingsState {
        guard let normalized = Self.normalizedAPIBaseURLString(updatedValue) else {
            return self
        }
        return HostRuntimeSettingsState(
            apiBaseURLString: normalized,
            rebuildToken: rebuildToken + 1
        )
    }

    /// Resolves user-provided API base URL to a safe URL with fallback.
    public func resolvedAPIBaseURL(
        fallback: URL = URL(string: "https://pastebin.sed.fyi")!
    ) -> URL {
        if let normalized = Self.normalizedAPIBaseURLString(apiBaseURLString),
           let parsed = URL(string: normalized) {
            return parsed
        }
        return fallback
    }

    /// Returns a normalized root API base URL string when valid; otherwise nil.
    public static func normalizedAPIBaseURLString(_ rawValue: String) -> String? {
        let trimmed = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard var components = URLComponents(string: trimmed),
              let scheme = components.scheme?.lowercased(),
              let host = components.host?.lowercased(),
              (scheme == "http" || scheme == "https")
        else {
            return nil
        }

        let path = components.percentEncodedPath
        if !(path.isEmpty || path == "/") {
            return nil
        }
        if components.percentEncodedQuery != nil || components.percentEncodedFragment != nil {
            return nil
        }
        if components.user != nil || components.password != nil {
            return nil
        }

        components.scheme = scheme
        components.host = host
        components.percentEncodedPath = ""
        components.percentEncodedQuery = nil
        components.percentEncodedFragment = nil
        components.user = nil
        components.password = nil
        guard let absolute = components.url?.absoluteString else {
            return nil
        }
        if absolute.hasSuffix("/") {
            return String(absolute.dropLast())
        }
        return absolute
    }

    /// Validates whether a candidate is a root API base URL with scheme+host only.
    public static func isValidAPIBaseURL(_ rawValue: String) -> Bool {
        normalizedAPIBaseURLString(rawValue) != nil
    }
}
