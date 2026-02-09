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
            apiBaseURLString: "http://127.0.0.1:3000",
            rebuildToken: 2
        )

        let updated = initial.applying(apiBaseURLString: "https://staging.pastebin.sed.fyi")

        #expect(updated.apiBaseURLString == "https://staging.pastebin.sed.fyi")
        #expect(updated.rebuildToken == 3)
    }

    @Test func resolvedAPIBaseURLFallsBackWhenInvalid() {
        let state = HostRuntimeSettingsState(apiBaseURLString: "invalid-url")
        let resolved = state.resolvedAPIBaseURL()

        #expect(resolved.absoluteString == "http://127.0.0.1:3000")
    }
}
