import Foundation

/// Conflict winner when local and remote entries differ for the same identifier.
public enum HistorySyncConflictResolution: String, Sendable, Hashable, Codable {
    case local
    case remote
}

/// Conflict metadata for one merged history identifier.
public struct HistorySyncConflict: Sendable, Hashable, Codable {
    public let id: String
    public let resolution: HistorySyncConflictResolution
    public let localCreatedAtMillis: Int64
    public let remoteCreatedAtMillis: Int64

    public init(
        id: String,
        resolution: HistorySyncConflictResolution,
        localCreatedAtMillis: Int64,
        remoteCreatedAtMillis: Int64
    ) {
        self.id = id
        self.resolution = resolution
        self.localCreatedAtMillis = localCreatedAtMillis
        self.remoteCreatedAtMillis = remoteCreatedAtMillis
    }
}

/// Aggregate sync statistics for one cloud sync operation.
public struct HistorySyncStats: Sendable, Hashable, Codable {
    public var added: Int
    public var updated: Int
    public var unchanged: Int
    public var conflicts: Int

    public init(added: Int, updated: Int, unchanged: Int, conflicts: Int) {
        self.added = added
        self.updated = updated
        self.unchanged = unchanged
        self.conflicts = conflicts
    }
}

/// Result payload returned after a sync operation completes.
public struct HistorySyncResult: Sendable, Hashable, Codable {
    public let stats: HistorySyncStats
    public let conflicts: [HistorySyncConflict]
    public let syncedAtMillis: Int64

    public init(
        stats: HistorySyncStats,
        conflicts: [HistorySyncConflict],
        syncedAtMillis: Int64
    ) {
        self.stats = stats
        self.conflicts = conflicts
        self.syncedAtMillis = syncedAtMillis
    }
}

/// Cloud adapter contract for loading and persisting history snapshots.
public protocol HistoryCloudSyncAdapter: Sendable {
    func fetchRemoteEntries() async throws -> [HistoryEntry]
    func pushRemoteEntries(_ entries: [HistoryEntry]) async throws
}

/// Errors raised while reading or writing sync payloads.
public enum HistoryCloudSyncError: LocalizedError {
    case invalidPayloadVersion(Int)
    case payloadDecodeFailed

    public var errorDescription: String? {
        switch self {
        case let .invalidPayloadVersion(version):
            return "Unsupported cloud sync payload version: \(version)."
        case .payloadDecodeFailed:
            return "Unable to decode cloud sync payload."
        }
    }
}

/// iCloud-backed history adapter using ubiquitous key-value storage.
public actor ICloudHistorySyncAdapter: HistoryCloudSyncAdapter {
    private struct CloudHistoryPayload: Codable {
        let version: Int
        let exportedAtMillis: Int64
        let entries: [HistoryEntry]
    }

    private let store: NSUbiquitousKeyValueStore
    private let storageKey: String
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder
    private let nowMillis: @Sendable () -> Int64

    public init(
        store: NSUbiquitousKeyValueStore = .default,
        storageKey: String = "secure_pastebin_history_cloud_payload_v1",
        nowMillis: @escaping @Sendable () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1000) }
    ) {
        self.store = store
        self.storageKey = storageKey
        self.encoder = JSONEncoder()
        self.decoder = JSONDecoder()
        self.nowMillis = nowMillis
    }

    public func fetchRemoteEntries() async throws -> [HistoryEntry] {
        guard let data = store.data(forKey: storageKey) else {
            return []
        }

        guard let payload = try? decoder.decode(CloudHistoryPayload.self, from: data) else {
            throw HistoryCloudSyncError.payloadDecodeFailed
        }
        guard payload.version == 1 else {
            throw HistoryCloudSyncError.invalidPayloadVersion(payload.version)
        }
        return payload.entries
    }

    public func pushRemoteEntries(_ entries: [HistoryEntry]) async throws {
        let payload = CloudHistoryPayload(
            version: 1,
            exportedAtMillis: nowMillis(),
            entries: entries
        )
        let data = try encoder.encode(payload)
        store.set(data, forKey: storageKey)
        _ = store.synchronize()
    }
}

/// Coordinates one-shot history sync and conflict-aware merge.
public actor HistoryCloudSyncCoordinator {
    private let historyStore: HistoryStore
    private let cloudAdapter: HistoryCloudSyncAdapter
    private let nowMillis: @Sendable () -> Int64

    public init(
        historyStore: HistoryStore,
        cloudAdapter: HistoryCloudSyncAdapter,
        nowMillis: @escaping @Sendable () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1000) }
    ) {
        self.historyStore = historyStore
        self.cloudAdapter = cloudAdapter
        self.nowMillis = nowMillis
    }

    /// Syncs local and cloud history snapshots and returns merge/conflict metadata.
    public func syncNow() async throws -> HistorySyncResult {
        let localEntries = try await historyStore.list()
        let remoteEntries = try await cloudAdapter.fetchRemoteEntries()
        let merge = mergeEntries(local: localEntries, remote: remoteEntries)

        let localIDs = Set(localEntries.map(\.id))
        let mergedIDs = Set(merge.entries.map(\.id))
        for removedID in localIDs.subtracting(mergedIDs) {
            try await historyStore.delete(id: removedID)
        }
        for entry in merge.entries {
            try await historyStore.upsert(entry)
        }
        try await cloudAdapter.pushRemoteEntries(merge.entries)

        return HistorySyncResult(
            stats: merge.stats,
            conflicts: merge.conflicts,
            syncedAtMillis: nowMillis()
        )
    }

    private func mergeEntries(
        local: [HistoryEntry],
        remote: [HistoryEntry]
    ) -> (entries: [HistoryEntry], stats: HistorySyncStats, conflicts: [HistorySyncConflict]) {
        let localMap = Dictionary(uniqueKeysWithValues: local.map { ($0.id, $0) })
        let remoteMap = Dictionary(uniqueKeysWithValues: remote.map { ($0.id, $0) })
        let allIDs = Set(localMap.keys).union(remoteMap.keys)

        var merged: [HistoryEntry] = []
        var conflicts: [HistorySyncConflict] = []
        var stats = HistorySyncStats(added: 0, updated: 0, unchanged: 0, conflicts: 0)

        for id in allIDs {
            let localEntry = localMap[id]
            let remoteEntry = remoteMap[id]

            switch (localEntry, remoteEntry) {
            case let (localEntry?, nil):
                merged.append(localEntry)
                stats.added += 1
            case let (nil, remoteEntry?):
                merged.append(remoteEntry)
                stats.added += 1
            case let (localEntry?, remoteEntry?):
                if localEntry == remoteEntry {
                    merged.append(localEntry)
                    stats.unchanged += 1
                    continue
                }

                let resolution: HistorySyncConflictResolution
                let winner: HistoryEntry
                if localEntry.createdAtMillis >= remoteEntry.createdAtMillis {
                    resolution = .local
                    winner = localEntry
                } else {
                    resolution = .remote
                    winner = remoteEntry
                }

                merged.append(winner)
                conflicts.append(
                    HistorySyncConflict(
                        id: id,
                        resolution: resolution,
                        localCreatedAtMillis: localEntry.createdAtMillis,
                        remoteCreatedAtMillis: remoteEntry.createdAtMillis
                    )
                )
                stats.updated += 1
                stats.conflicts += 1
            case (nil, nil):
                continue
            }
        }

        merged.sort { $0.createdAtMillis > $1.createdAtMillis }
        return (entries: merged, stats: stats, conflicts: conflicts)
    }
}
