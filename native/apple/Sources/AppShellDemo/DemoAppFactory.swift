/// Factory helpers for constructing a runnable Apple sample app host shell.
import CoreCrypto
import CoreNetworking
import CoreStorage
import FeatureHistory
import FeatureUpload
import FeatureView
import Foundation
import SwiftUI

/// Builds `AppHostFlowView` with production module wiring for local development.
public enum DemoAppFactory {
    /// Creates a fully wired host shell view for iOS/iPadOS/macOS demo targets.
    @MainActor
    public static func makeRootView(
        apiBaseURL: URL = URL(string: "https://pastebin.sed.fyi")!,
        shareBaseURL: URL? = nil,
        historyDefaults: UserDefaults = .standard
    ) -> some View {
        let apiClient = URLSessionAPIClient(
            configuration: .init(baseURL: apiBaseURL)
        )
        let cryptoEngine = ProductionNativeCryptoEngine()
        let historyStore = UserDefaultsHistoryStore(defaults: historyDefaults)
        let cloudSyncAdapter = ICloudHistorySyncAdapter()
        let cloudSyncCoordinator = HistoryCloudSyncCoordinator(
            historyStore: historyStore,
            cloudAdapter: cloudSyncAdapter
        )
        let resolvedShareBaseURL = shareBaseURL ?? apiBaseURL

        let uploadFeature = UploadFeature(
            apiClient: apiClient,
            cryptoEngine: cryptoEngine,
            shareBaseURL: resolvedShareBaseURL
        )
        let decryptFeature = ViewFeature(
            apiClient: apiClient,
            cryptoEngine: cryptoEngine,
            historyStore: historyStore
        )
        let historyFeature = HistoryFeature(
            historyStore: historyStore,
            shareBaseURL: resolvedShareBaseURL
        )

        return AppHostFlowView(
            uploadViewModel: UploadFlowViewModel(uploadService: uploadFeature),
            decryptViewModel: DecryptFlowViewModel(viewService: decryptFeature),
            historyViewModel: HistoryFlowViewModel(
                historyFeature: historyFeature,
                cloudSyncCoordinator: cloudSyncCoordinator
            ),
            initialTab: .upload
        )
    }
}
