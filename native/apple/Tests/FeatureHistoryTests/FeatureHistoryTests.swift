import CoreStorage
import Foundation
import Testing
@testable import FeatureHistory

/// History feature tests for filter/sort/delete behavior.
struct FeatureHistoryTests {
    @Test func listExcludesExpiredWhenDisabled() async throws {
        let store = FakeHistoryStore(entries: [
            .init(id: "a", fileName: "alpha.txt", createdAtMillis: 200, expiresAtMillis: 900),
            .init(id: "b", fileName: "beta.txt", createdAtMillis: 100, expiresAtMillis: 0),
            .init(id: "c", fileName: "gamma.txt", createdAtMillis: 300, expiresAtMillis: 400)
        ])
        let feature = HistoryFeature(historyStore: store, nowMillis: { 500 })

        let items = try await feature.list(includeExpired: false)

        #expect(items.map(\.id) == ["a", "b"])
        #expect(items.allSatisfy { !$0.isExpired })
    }

    @Test func listIncludesExpiredWhenEnabled() async throws {
        let store = FakeHistoryStore(entries: [
            .init(id: "a", fileName: "alpha.txt", createdAtMillis: 200, expiresAtMillis: 900),
            .init(id: "b", fileName: "beta.txt", createdAtMillis: 100, expiresAtMillis: 0),
            .init(id: "c", fileName: "gamma.txt", createdAtMillis: 300, expiresAtMillis: 400)
        ])
        let feature = HistoryFeature(historyStore: store, nowMillis: { 500 })

        let items = try await feature.list(includeExpired: true)

        #expect(items.map(\.id) == ["c", "a", "b"])
        #expect(items.first(where: { $0.id == "c" })?.isExpired == true)
    }

    @Test func deleteRemovesEntryFromStore() async throws {
        let store = FakeHistoryStore(entries: [
            .init(id: "a", fileName: "alpha.txt", createdAtMillis: 200, expiresAtMillis: 0),
            .init(id: "b", fileName: "beta.txt", createdAtMillis: 100, expiresAtMillis: 0)
        ])
        let feature = HistoryFeature(historyStore: store, nowMillis: { 1000 })

        try await feature.delete(id: "a")
        let items = try await feature.list(includeExpired: true)

        #expect(items.map(\.id) == ["b"])
    }

    @Test func listIncludesShareURLsWhenConfigured() async throws {
        let store = FakeHistoryStore(entries: [
            .init(id: "file abc", fileName: "alpha.txt", createdAtMillis: 200, expiresAtMillis: 0)
        ])
        let feature = HistoryFeature(
            historyStore: store,
            shareBaseURL: URL(string: "https://pastebin.sed.fyi/")!,
            nowMillis: { 1000 }
        )

        let items = try await feature.list(includeExpired: true)

        #expect(items.count == 1)
        #expect(items.first?.shareURL?.absoluteString == "https://pastebin.sed.fyi/p/file%20abc")
    }
}

/// History flow view-model tests covering cloud sync state transitions.
@MainActor
struct FeatureHistoryFlowViewModelTests {
    @Test func syncCloudWithoutCoordinatorMovesToFailureState() {
        let store = FakeHistoryStore(entries: [])
        let feature = HistoryFeature(historyStore: store, nowMillis: { 500 })
        let viewModel = HistoryFlowViewModel(historyFeature: feature, cloudSyncCoordinator: nil)

        viewModel.syncCloud()

        #expect(viewModel.cloudSyncState == .failure(message: "Cloud sync is not configured."))
    }

    @Test func syncCloudConfiguredTransitionsFromSyncingToSuccess() async throws {
        let store = FakeHistoryStore(entries: [])
        let adapter = ControlledCloudSyncAdapter(
            remoteEntries: [
                .init(id: "remote-1", fileName: "remote.txt", createdAtMillis: 250, expiresAtMillis: 900)
            ],
            fetchDelayNanoseconds: 50_000_000
        )
        let coordinator = HistoryCloudSyncCoordinator(
            historyStore: store,
            cloudAdapter: adapter,
            nowMillis: { 7_000 }
        )
        let feature = HistoryFeature(historyStore: store, nowMillis: { 500 })
        let viewModel = HistoryFlowViewModel(historyFeature: feature, cloudSyncCoordinator: coordinator)

        viewModel.syncCloud()
        #expect(viewModel.cloudSyncState == .syncing)

        await waitForCloudSyncState(viewModel: viewModel) { state in
            if case .success = state {
                return true
            }
            return false
        }

        if case let .success(summary) = viewModel.cloudSyncState {
            #expect(summary == "Synced 1 added, 0 updated, 0 conflicts.")
        } else {
            Issue.record("Expected cloud sync success state.")
        }
        #expect(viewModel.entries.map(\.id) == ["remote-1"])
    }

    @Test func syncCloudConfiguredTransitionsFromSyncingToFailure() async throws {
        let store = FakeHistoryStore(entries: [])
        let adapter = ControlledCloudSyncAdapter(
            remoteEntries: [],
            shouldFailFetch: true,
            fetchDelayNanoseconds: 50_000_000
        )
        let coordinator = HistoryCloudSyncCoordinator(
            historyStore: store,
            cloudAdapter: adapter,
            nowMillis: { 8_000 }
        )
        let feature = HistoryFeature(historyStore: store, nowMillis: { 500 })
        let viewModel = HistoryFlowViewModel(historyFeature: feature, cloudSyncCoordinator: coordinator)

        viewModel.syncCloud()
        #expect(viewModel.cloudSyncState == .syncing)

        await waitForCloudSyncState(viewModel: viewModel) { state in
            if case .failure = state {
                return true
            }
            return false
        }

        if case let .failure(message) = viewModel.cloudSyncState {
            #expect(message == "Injected sync failure.")
        } else {
            Issue.record("Expected cloud sync failure state.")
        }
    }
}

/// History flow cloud-sync UI messaging tests for state-to-text mapping.
struct HistoryFlowCloudSyncPresentationTests {
    @Test func cloudSyncActionTitleMatchesSyncState() {
        #expect(HistoryFlowCloudSyncPresentation.actionTitle(for: .idle) == "Sync iCloud")
        #expect(HistoryFlowCloudSyncPresentation.actionTitle(for: .syncing) == "Syncing...")
        #expect(
            HistoryFlowCloudSyncPresentation.actionTitle(for: .success(summary: "done")) == "Sync iCloud"
        )
        #expect(
            HistoryFlowCloudSyncPresentation.actionTitle(for: .failure(message: "failed")) == "Sync iCloud"
        )
    }

    @Test func cloudSyncStatusPresentationMatchesAllStates() {
        #expect(
            HistoryFlowCloudSyncPresentation.status(for: .idle) ==
                .init(text: "Not synced yet.", isError: false)
        )
        #expect(
            HistoryFlowCloudSyncPresentation.status(for: .syncing) ==
                .init(text: "Syncing with iCloud...", isError: false)
        )
        #expect(
            HistoryFlowCloudSyncPresentation.status(for: .success(summary: "Synced 1 added.")) ==
                .init(text: "Synced 1 added.", isError: false)
        )
        #expect(
            HistoryFlowCloudSyncPresentation.status(for: .failure(message: "Cloud failed.")) ==
                .init(text: "Cloud failed.", isError: true)
        )
    }
}

private actor FakeHistoryStore: HistoryStore {
    var entries: [HistoryEntry]

    init(entries: [HistoryEntry]) {
        self.entries = entries
    }

    func upsert(_ entry: HistoryEntry) async throws {
        if let index = entries.firstIndex(where: { $0.id == entry.id }) {
            entries[index] = entry
        } else {
            entries.append(entry)
        }
    }

    func list() async throws -> [HistoryEntry] {
        entries
    }

    func delete(id: String) async throws {
        entries.removeAll(where: { $0.id == id })
    }
}

/// Cloud adapter with configurable delay and failure behavior for deterministic tests.
private actor ControlledCloudSyncAdapter: HistoryCloudSyncAdapter {
    private var remoteEntries: [HistoryEntry]
    private let shouldFailFetch: Bool
    private let fetchDelayNanoseconds: UInt64

    init(
        remoteEntries: [HistoryEntry],
        shouldFailFetch: Bool = false,
        fetchDelayNanoseconds: UInt64 = 0
    ) {
        self.remoteEntries = remoteEntries
        self.shouldFailFetch = shouldFailFetch
        self.fetchDelayNanoseconds = fetchDelayNanoseconds
    }

    func fetchRemoteEntries() async throws -> [HistoryEntry] {
        if fetchDelayNanoseconds > 0 {
            try await Task.sleep(nanoseconds: fetchDelayNanoseconds)
        }
        if shouldFailFetch {
            throw CloudSyncTestError.injectedFailure
        }
        return remoteEntries
    }

    func pushRemoteEntries(_ entries: [HistoryEntry]) async throws {
        remoteEntries = entries
    }
}

/// Polls the cloud sync state until a predicate matches or a bounded timeout expires.
@MainActor
private func waitForCloudSyncState(
    viewModel: HistoryFlowViewModel,
    timeoutIterations: Int = 100,
    pollNanoseconds: UInt64 = 10_000_000,
    matches: @escaping (HistoryFlowViewModel.CloudSyncState) -> Bool
) async {
    for _ in 0..<timeoutIterations {
        if matches(viewModel.cloudSyncState) {
            return
        }
        try? await Task.sleep(nanoseconds: pollNanoseconds)
    }
}

/// Injected test error to validate failure-state messaging from cloud sync.
private enum CloudSyncTestError: LocalizedError {
    case injectedFailure

    var errorDescription: String? {
        switch self {
        case .injectedFailure:
            return "Injected sync failure."
        }
    }
}
