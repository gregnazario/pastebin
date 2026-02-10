/// Runtime settings sheet for configuring demo app connectivity.
import AppShellDemo
import Foundation
import SwiftUI

struct DemoSettingsView: View {
    private enum DemoEnvironmentPreset: String, CaseIterable, Identifiable {
        case local
        case staging
        case production

        var id: String { rawValue }

        var title: String {
            switch self {
            case .local:
                return "Local"
            case .staging:
                return "Staging"
            case .production:
                return "Production"
            }
        }

        var baseURLString: String {
            switch self {
            case .local:
                return "http://127.0.0.1:3000"
            case .staging:
                return "https://staging.pastebin.sed.fyi"
            case .production:
                return "https://pastebin.sed.fyi"
            }
        }

        static func matching(urlString: String) -> DemoEnvironmentPreset? {
            let normalized = normalize(urlString)
            return allCases.first { normalize($0.baseURLString) == normalized }
        }

        private static func normalize(_ value: String) -> String {
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.hasSuffix("/") {
                return String(trimmed.dropLast())
            }
            return trimmed
        }
    }

    @Environment(\.dismiss) private var dismiss

    @State private var selectedEnvironmentPreset: DemoEnvironmentPreset
    @State private var draftAPIBaseURLString: String
    @State private var validationMessage: String?

    private let onApply: (String) -> Void

    init(
        currentAPIBaseURLString: String,
        onApply: @escaping (String) -> Void
    ) {
        let initialPreset = DemoEnvironmentPreset.matching(urlString: currentAPIBaseURLString) ?? .local
        _selectedEnvironmentPreset = State(initialValue: initialPreset)
        _draftAPIBaseURLString = State(initialValue: currentAPIBaseURLString)
        self.onApply = onApply
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Environment") {
                    Picker("Preset", selection: $selectedEnvironmentPreset) {
                        ForEach(DemoEnvironmentPreset.allCases) { preset in
                            Text(preset.title).tag(preset)
                        }
                    }
                    .pickerStyle(.segmented)

                    Button("Use Selected Preset") {
                        draftAPIBaseURLString = selectedEnvironmentPreset.baseURLString
                        validationMessage = nil
                    }
                    .buttonStyle(.borderedProminent)
                    Text(selectedEnvironmentPreset.baseURLString)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("API") {
                    TextField("Base URL", text: $draftAPIBaseURLString)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                        .keyboardType(.URL)
                    Text("Example: \(DemoEnvironmentPreset.local.baseURLString)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                if let validationMessage {
                    Section("Error") {
                        Text(validationMessage)
                            .foregroundStyle(.red)
                    }
                }

            }
            .navigationTitle("Demo Settings")
            .premiumMinimalFormStyle()
            .onChange(of: draftAPIBaseURLString) { _, updatedValue in
                if let matched = DemoEnvironmentPreset.matching(urlString: updatedValue) {
                    selectedEnvironmentPreset = matched
                }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Apply") {
                        apply()
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
        }
    }

    private func apply() {
        let trimmed = draftAPIBaseURLString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard isValidBaseURL(trimmed) else {
            validationMessage = "Enter a valid URL including scheme and host."
            return
        }

        onApply(trimmed)
        dismiss()
    }

    private func isValidBaseURL(_ candidate: String) -> Bool {
        guard let url = URL(string: candidate),
              let scheme = url.scheme,
              let host = url.host,
              !scheme.isEmpty,
              !host.isEmpty else {
            return false
        }
        return true
    }
}
