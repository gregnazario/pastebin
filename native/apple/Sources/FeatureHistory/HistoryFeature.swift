/// History feature logic and SwiftUI screen wiring for Apple native clients.
import CoreStorage
import Foundation
import SwiftUI

/// Presentation model for one history row in native UI.
public struct HistoryListItem: Sendable, Hashable {
    public let id: String
    public let fileName: String
    public let createdAtMillis: Int64
    public let expiresAtMillis: Int64
    public let isExpired: Bool
    public let shareURL: URL?

    public init(
        id: String,
        fileName: String,
        createdAtMillis: Int64,
        expiresAtMillis: Int64,
        isExpired: Bool,
        shareURL: URL?
    ) {
        self.id = id
        self.fileName = fileName
        self.createdAtMillis = createdAtMillis
        self.expiresAtMillis = expiresAtMillis
        self.isExpired = isExpired
        self.shareURL = shareURL
    }
}

/// History use-case service for filtering and deleting entries.
public struct HistoryFeature {
    private let historyStore: HistoryStore
    private let shareBaseURL: URL?
    private let nowMillis: @Sendable () -> Int64

    public init(
        historyStore: HistoryStore,
        shareBaseURL: URL? = nil,
        nowMillis: @escaping @Sendable () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1000) }
    ) {
        self.historyStore = historyStore
        self.shareBaseURL = shareBaseURL
        self.nowMillis = nowMillis
    }

    /// Loads history and optionally excludes expired entries.
    public func list(includeExpired: Bool) async throws -> [HistoryListItem] {
        let now = nowMillis()
        let entries = try await historyStore.list()
        let items = entries.map { entry in
            let expired = entry.expiresAtMillis > 0 && entry.expiresAtMillis <= now
            return HistoryListItem(
                id: entry.id,
                fileName: entry.fileName,
                createdAtMillis: entry.createdAtMillis,
                expiresAtMillis: entry.expiresAtMillis,
                isExpired: expired,
                shareURL: buildShareURL(id: entry.id)
            )
        }

        return items
            .filter { includeExpired || !$0.isExpired }
            .sorted(by: { $0.createdAtMillis > $1.createdAtMillis })
    }

    /// Deletes a history entry by ID.
    public func delete(id: String) async throws {
        try await historyStore.delete(id: id)
    }

    private func buildShareURL(id: String) -> URL? {
        guard let shareBaseURL,
              var components = URLComponents(url: shareBaseURL, resolvingAgainstBaseURL: false) else {
            return nil
        }

        let normalizedPath = components.path.hasSuffix("/")
            ? String(components.path.dropLast())
            : components.path
        components.path = "\(normalizedPath)/p/\(id)"
        components.percentEncodedFragment = nil
        return components.url
    }
}

@MainActor
public final class HistoryFlowViewModel: ObservableObject {
    @Published public var includeExpired: Bool = false
    @Published public var isLoading: Bool = false
    @Published public var entries: [HistoryListItem] = []
    @Published public var errorMessage: String?

    private let historyFeature: HistoryFeature

    public init(historyFeature: HistoryFeature) {
        self.historyFeature = historyFeature
    }

    /// Refreshes history entries from storage.
    public func load() {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil

        Task {
            do {
                entries = try await historyFeature.list(includeExpired: includeExpired)
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }

    /// Deletes one entry and refreshes the list.
    public func delete(id: String) {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await historyFeature.delete(id: id)
                entries = try await historyFeature.list(includeExpired: includeExpired)
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

/// SwiftUI history screen with filtering and delete actions.
public struct HistoryFlowView: View {
    @StateObject private var viewModel: HistoryFlowViewModel
    private let onOpenInDecrypt: ((URL) -> Void)?
    @Environment(\.openURL) private var openURL

    public init(
        viewModel: HistoryFlowViewModel,
        onOpenInDecrypt: ((URL) -> Void)? = nil
    ) {
        _viewModel = StateObject(wrappedValue: viewModel)
        self.onOpenInDecrypt = onOpenInDecrypt
    }

    public var body: some View {
        Form {
            Section("Controls") {
                Toggle("Include expired", isOn: $viewModel.includeExpired)
                Button(viewModel.isLoading ? "Refreshing..." : "Refresh") {
                    viewModel.load()
                }
                .disabled(viewModel.isLoading)
            }

            Section("Recent Decrypts") {
                if viewModel.entries.isEmpty && !viewModel.isLoading {
                    Text("No history entries.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(viewModel.entries, id: \.id) { entry in
                        rowView(entry)
                    }
                }
            }

            if let errorMessage = viewModel.errorMessage {
                Section("Error") {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                }
            }
        }
        .navigationTitle("History")
        .onAppear {
            if viewModel.entries.isEmpty {
                viewModel.load()
            }
        }
        .onChange(of: viewModel.includeExpired) { _, _ in
            viewModel.load()
        }
    }

    @ViewBuilder
    private func rowView(_ entry: HistoryListItem) -> some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.fileName)
                    .font(.headline)
                Text("ID: \(entry.id)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .textSelection(.enabled)
                Text("Created: \(formatDate(entry.createdAtMillis))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(expirationText(entry))
                    .font(.caption)
                    .foregroundStyle(entry.isExpired ? .red : .secondary)
            }
            Spacer(minLength: 12)
            VStack(alignment: .trailing, spacing: 6) {
                if let shareURL = entry.shareURL {
                    Button("Open") {
                        if let onOpenInDecrypt {
                            onOpenInDecrypt(shareURL)
                        } else {
                            openURL(shareURL)
                        }
                    }
                    .font(.callout)

                    ShareLink("Share", item: shareURL)
                        .font(.callout)
                }

                Button("Delete", role: .destructive) {
                    viewModel.delete(id: entry.id)
                }
                .disabled(viewModel.isLoading)
            }
        }
    }

    private func expirationText(_ entry: HistoryListItem) -> String {
        guard entry.expiresAtMillis > 0 else {
            return "Expires: Never"
        }

        if entry.isExpired {
            return "Expires: \(formatDate(entry.expiresAtMillis)) (expired)"
        }

        return "Expires: \(formatDate(entry.expiresAtMillis))"
    }

    private func formatDate(_ millis: Int64) -> String {
        guard millis > 0 else {
            return "N/A"
        }
        let date = Date(timeIntervalSince1970: TimeInterval(millis) / 1000)
        return HistoryFlowDateFormatter.shared.string(from: date)
    }
}

private enum HistoryFlowDateFormatter {
    static let shared: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()
}
