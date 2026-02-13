import CoreStorage
import Foundation
import Testing

/// CoreStorage cloud-sync tests covering merge and conflict behavior.
struct CoreStorageSyncTests {
    @Test func syncImportsRemoteEntriesAndPushesMergedSnapshot() async throws {
        let localStore = InMemoryHistoryStore(entries: [])
        let cloudAdapter = RecordingCloudAdapter(
            remoteEntries: [
                .init(id: "remote-1", fileName: "remote.txt", createdAtMillis: 200, expiresAtMillis: 1_000)
            ]
        )
        let coordinator = HistoryCloudSyncCoordinator(
            historyStore: localStore,
            cloudAdapter: cloudAdapter,
            nowMillis: { 5_000 }
        )

        let result = try await coordinator.syncNow()
        let localEntries = try await localStore.list()
        let pushedEntries = await cloudAdapter.lastPushedEntries()

        #expect(result.stats.added == 1)
        #expect(result.stats.updated == 0)
        #expect(result.stats.unchanged == 0)
        #expect(result.stats.conflicts == 0)
        #expect(result.conflicts.isEmpty)
        #expect(localEntries.count == 1)
        #expect(localEntries.first?.id == "remote-1")
        #expect(pushedEntries.count == 1)
    }

    @Test func syncTracksConflictAndPrefersNewerCreatedAt() async throws {
        let localStore = InMemoryHistoryStore(entries: [
            .init(id: "item-1", fileName: "local.txt", createdAtMillis: 100, expiresAtMillis: 900)
        ])
        let cloudAdapter = RecordingCloudAdapter(
            remoteEntries: [
                .init(id: "item-1", fileName: "remote.txt", createdAtMillis: 300, expiresAtMillis: 1_200)
            ]
        )
        let coordinator = HistoryCloudSyncCoordinator(
            historyStore: localStore,
            cloudAdapter: cloudAdapter,
            nowMillis: { 6_000 }
        )

        let result = try await coordinator.syncNow()
        let localEntries = try await localStore.list()

        #expect(result.stats.conflicts == 1)
        #expect(result.stats.updated == 1)
        #expect(result.conflicts.count == 1)
        #expect(result.conflicts.first?.resolution == .remote)
        #expect(localEntries.count == 1)
        #expect(localEntries.first?.fileName == "remote.txt")
        #expect(localEntries.first?.createdAtMillis == 300)
    }
}

private actor InMemoryHistoryStore: HistoryStore {
    private var entries: [HistoryEntry]

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

private actor RecordingCloudAdapter: HistoryCloudSyncAdapter {
    private var remoteEntries: [HistoryEntry]
    private var pushedSnapshots: [[HistoryEntry]] = []

    init(remoteEntries: [HistoryEntry]) {
        self.remoteEntries = remoteEntries
    }

    func fetchRemoteEntries() async throws -> [HistoryEntry] {
        remoteEntries
    }

    func pushRemoteEntries(_ entries: [HistoryEntry]) async throws {
        remoteEntries = entries
        pushedSnapshots.append(entries)
    }

    func lastPushedEntries() -> [HistoryEntry] {
        pushedSnapshots.last ?? []
    }
}
