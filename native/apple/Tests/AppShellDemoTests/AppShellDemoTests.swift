import Foundation
import Testing
@testable import AppShellDemo

/// Tests for host-level handoff coordination between history and decrypt tabs.
@MainActor
struct AppShellDemoTests {
    @Test func historyOpenPrefillsDecryptAndSwitchesTab() {
        var capturedURL: URL?
        let coordinator = HistoryDecryptHandoffCoordinator(initialTab: .history) { url in
            capturedURL = url
        }
        let url = URL(string: "https://pastebin.sed.fyi/p/file-abc")!

        coordinator.handleHistoryOpen(url)

        #expect(capturedURL == url)
        #expect(coordinator.selectedTab == .decrypt)
    }

    @Test func historyOpenKeepsDecryptSelectedAndPrefillsLatestURL() {
        var capturedURLs: [URL] = []
        let coordinator = HistoryDecryptHandoffCoordinator(initialTab: .upload) { url in
            capturedURLs.append(url)
        }
        let first = URL(string: "https://pastebin.sed.fyi/p/file-one")!
        let second = URL(string: "https://pastebin.sed.fyi/p/file-two")!

        coordinator.handleHistoryOpen(first)
        coordinator.handleHistoryOpen(second)

        #expect(coordinator.selectedTab == .decrypt)
        #expect(capturedURLs == [first, second])
    }
}

/// Host runtime settings apply/rebuild tests.
struct HostRuntimeSettingsStateTests {
    @Test func applyingSettingsUpdatesURLAndIncrementsRebuildToken() {
        let initial = HostRuntimeSettingsState(
            apiBaseURLString: "https://pastebin.sed.fyi",
            rebuildToken: 2
        )

        let updated = initial.applying(apiBaseURLString: "https://staging.pastebin.sed.fyi")

        #expect(updated.apiBaseURLString == "https://staging.pastebin.sed.fyi")
        #expect(updated.rebuildToken == 3)
    }

    @Test func resolvedAPIBaseURLFallsBackWhenInvalid() {
        let state = HostRuntimeSettingsState(apiBaseURLString: "invalid-url")
        let resolved = state.resolvedAPIBaseURL()

        #expect(resolved.absoluteString == "https://pastebin.sed.fyi")
    }

    @Test func resolvedAPIBaseURLFallsBackWhenPathIsProvided() {
        let state = HostRuntimeSettingsState(apiBaseURLString: "https://pastebin.sed.fyi/upload")
        let resolved = state.resolvedAPIBaseURL()

        #expect(resolved.absoluteString == "https://pastebin.sed.fyi")
    }

    @Test func normalizedAPIBaseURLStringAcceptsRootAndRejectsPath() {
        let normalized = HostRuntimeSettingsState.normalizedAPIBaseURLString(" https://pastebin.sed.fyi/ ")
        #expect(normalized == "https://pastebin.sed.fyi")
        #expect(HostRuntimeSettingsState.normalizedAPIBaseURLString("https://pastebin.sed.fyi/p/abc") == nil)
        #expect(HostRuntimeSettingsState.normalizedAPIBaseURLString("https://pastebin.sed.fyi?foo=bar") == nil)
    }
}

/// Root-container settings sheet flow tests.
struct DemoRootFlowStateTests {
    @Test func presentAndCancelSettingsTogglesSheetWithoutRebuild() {
        var state = DemoRootFlowState(
            runtimeSettings: .init(apiBaseURLString: "https://pastebin.sed.fyi", rebuildToken: 5),
            isSettingsPresented: false
        )

        state.presentSettings()
        #expect(state.isSettingsPresented == true)
        #expect(state.runtimeSettings.rebuildToken == 5)

        state.cancelSettings()
        #expect(state.isSettingsPresented == false)
        #expect(state.runtimeSettings.rebuildToken == 5)
    }

    @Test func applySettingsDismissesSheetAndIncrementsRebuildToken() {
        var state = DemoRootFlowState(
            runtimeSettings: .init(apiBaseURLString: "https://pastebin.sed.fyi", rebuildToken: 1),
            isSettingsPresented: true
        )

        state.applySettings(apiBaseURLString: "https://staging.pastebin.sed.fyi")

        #expect(state.isSettingsPresented == false)
        #expect(state.runtimeSettings.apiBaseURLString == "https://staging.pastebin.sed.fyi")
        #expect(state.runtimeSettings.rebuildToken == 2)
    }
}
