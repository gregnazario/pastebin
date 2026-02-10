/// Sample Apple host shell wiring Upload, Decrypt, and History flows with in-app handoff.
import FeatureHistory
import FeatureUpload
import FeatureView
import SwiftUI

/// Tab identifiers for the sample host shell.
public enum AppHostTab: String, Hashable, Sendable {
    case upload
    case decrypt
    case history
}

/// Coordinates in-app handoff from History open actions into the Decrypt tab.
@MainActor
public final class HistoryDecryptHandoffCoordinator: ObservableObject {
    @Published public var selectedTab: AppHostTab
    private let prefillDecrypt: @MainActor (URL) -> Void

    public init(
        initialTab: AppHostTab = .upload,
        prefillDecrypt: @escaping @MainActor (URL) -> Void
    ) {
        self.selectedTab = initialTab
        self.prefillDecrypt = prefillDecrypt
    }

    /// Routes selected history link into decrypt prefill and switches to decrypt tab.
    public func handleHistoryOpen(_ shareURL: URL) {
        prefillDecrypt(shareURL)
        selectedTab = .decrypt
    }
}

/// SwiftUI sample app shell demonstrating history-to-decrypt handoff.
public struct AppHostFlowView: View {
    @StateObject private var uploadViewModel: UploadFlowViewModel
    @StateObject private var decryptViewModel: DecryptFlowViewModel
    @StateObject private var historyViewModel: HistoryFlowViewModel
    @StateObject private var handoffCoordinator: HistoryDecryptHandoffCoordinator

    public init(
        uploadViewModel: UploadFlowViewModel,
        decryptViewModel: DecryptFlowViewModel,
        historyViewModel: HistoryFlowViewModel,
        initialTab: AppHostTab = .upload
    ) {
        _uploadViewModel = StateObject(wrappedValue: uploadViewModel)
        _decryptViewModel = StateObject(wrappedValue: decryptViewModel)
        _historyViewModel = StateObject(wrappedValue: historyViewModel)
        _handoffCoordinator = StateObject(
            wrappedValue: HistoryDecryptHandoffCoordinator(initialTab: initialTab) { url in
                decryptViewModel.prefillShareURL(url)
            }
        )
    }

    public var body: some View {
        TabView(selection: $handoffCoordinator.selectedTab) {
            NavigationStack {
                UploadFlowView(viewModel: uploadViewModel)
                    .premiumMinimalFormStyle()
            }
            .tabItem {
                Label("Upload", systemImage: "square.and.arrow.up")
            }
            .tag(AppHostTab.upload)

            NavigationStack {
                DecryptFlowView(viewModel: decryptViewModel)
                    .premiumMinimalFormStyle()
            }
            .tabItem {
                Label("Decrypt", systemImage: "lock.open")
            }
            .tag(AppHostTab.decrypt)

            NavigationStack {
                HistoryFlowView(
                    viewModel: historyViewModel,
                    onOpenInDecrypt: { shareURL in
                        handoffCoordinator.handleHistoryOpen(shareURL)
                    }
                )
                .premiumMinimalFormStyle()
            }
            .tabItem {
                Label("History", systemImage: "clock.arrow.circlepath")
            }
            .tag(AppHostTab.history)
        }
        .premiumMinimalRootStyle()
    }
}
