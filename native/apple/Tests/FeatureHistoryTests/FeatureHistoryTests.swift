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
