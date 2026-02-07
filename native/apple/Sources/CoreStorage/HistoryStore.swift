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
public struct HistoryEntry: Sendable, Hashable {
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
