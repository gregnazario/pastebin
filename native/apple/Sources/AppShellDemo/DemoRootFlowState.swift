/// Root container UI-flow state for deterministic settings-sheet behavior.
import Foundation

/// Presentation state for the demo root container.
public struct DemoRootFlowState: Equatable, Sendable {
    public var runtimeSettings: HostRuntimeSettingsState
    public var isSettingsPresented: Bool

    public init(
        runtimeSettings: HostRuntimeSettingsState,
        isSettingsPresented: Bool = false
    ) {
        self.runtimeSettings = runtimeSettings
        self.isSettingsPresented = isSettingsPresented
    }

    /// Presents the runtime settings sheet.
    public mutating func presentSettings() {
        isSettingsPresented = true
    }

    /// Dismisses settings without applying changes.
    public mutating func cancelSettings() {
        isSettingsPresented = false
    }

    /// Applies settings and dismisses the sheet.
    public mutating func applySettings(apiBaseURLString: String) {
        runtimeSettings = runtimeSettings.applying(apiBaseURLString: apiBaseURLString)
        isSettingsPresented = false
    }
}
