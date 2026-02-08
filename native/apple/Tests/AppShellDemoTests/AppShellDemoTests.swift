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
}
