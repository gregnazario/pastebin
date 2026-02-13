import Foundation

/// Storage contract for local and synchronized history entries.
public protocol HistoryStore {
    /// Saves or updates a history entry.
    func upsert(_ entry: HistoryEntry) async throws

    /// Lists stored entries in descending creation order.
    func list() async throws -> [HistoryEntry]

    /// Deletes an entry by identifier.
    func delete(id: String) async throws
}

/// History metadata for a previously uploaded encrypted blob.
public struct HistoryEntry: Sendable, Hashable, Codable {
    public let id: String
    public let fileName: String
    public let createdAtMillis: Int64
    public let expiresAtMillis: Int64

    public init(id: String, fileName: String, createdAtMillis: Int64, expiresAtMillis: Int64) {
        self.id = id
        self.fileName = fileName
        self.createdAtMillis = createdAtMillis
        self.expiresAtMillis = expiresAtMillis
    }
}

/// UserDefaults-backed history store for local Apple client persistence.
public actor UserDefaultsHistoryStore: HistoryStore {
    private let defaults: UserDefaults
    private let storageKey: String
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    public init(
        defaults: UserDefaults = .standard,
        storageKey: String = "secure_pastebin_history_entries_v1"
    ) {
        self.defaults = defaults
        self.storageKey = storageKey
        self.encoder = JSONEncoder()
        self.decoder = JSONDecoder()
    }

    public func upsert(_ entry: HistoryEntry) async throws {
        var entries = loadEntries()
        if let existingIndex = entries.firstIndex(where: { $0.id == entry.id }) {
            entries[existingIndex] = entry
        } else {
            entries.append(entry)
        }

        try persist(entries: entries)
    }

    public func list() async throws -> [HistoryEntry] {
        loadEntries().sorted(by: { $0.createdAtMillis > $1.createdAtMillis })
    }

    public func delete(id: String) async throws {
        var entries = loadEntries()
        entries.removeAll(where: { $0.id == id })
        try persist(entries: entries)
    }

    private func loadEntries() -> [HistoryEntry] {
        guard let data = defaults.data(forKey: storageKey) else {
            return []
        }

        do {
            return try decoder.decode([HistoryEntry].self, from: data)
        } catch {
            return []
        }
    }

    private func persist(entries: [HistoryEntry]) throws {
        let data = try encoder.encode(entries)
        defaults.set(data, forKey: storageKey)
    }
}
