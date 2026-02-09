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
        HostRuntimeSettingsState(
            apiBaseURLString: updatedValue,
            rebuildToken: rebuildToken + 1
        )
    }

    /// Resolves user-provided API base URL to a safe URL with fallback.
    public func resolvedAPIBaseURL(
        fallback: URL = URL(string: "http://127.0.0.1:3000")!
    ) -> URL {
        if let parsed = URL(string: apiBaseURLString), parsed.scheme != nil, parsed.host != nil {
            return parsed
        }
        return fallback
    }
}
