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
            guard let normalized = HostRuntimeSettingsState.normalizedAPIBaseURLString(urlString) else {
                return nil
            }
            return allCases.first { preset in
                HostRuntimeSettingsState.normalizedAPIBaseURLString(preset.baseURLString) == normalized
            }
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
        let initialPreset = DemoEnvironmentPreset.matching(urlString: currentAPIBaseURLString) ?? .production
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
                        .foregroundStyle(.primary)
                }

                Section("API") {
                    TextField("Base URL", text: $draftAPIBaseURLString)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                        .keyboardType(.URL)
                    Text("Use root origin only, e.g. \(DemoEnvironmentPreset.local.baseURLString)")
                        .font(.footnote)
                        .foregroundStyle(.primary)
                }

                if let validationMessage {
                    Section("Error") {
                        Text(validationMessage)
                            .foregroundStyle(Color(red: 0.60, green: 0.13, blue: 0.12))
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
        guard let normalized = HostRuntimeSettingsState.normalizedAPIBaseURLString(draftAPIBaseURLString) else {
            validationMessage = "Enter a valid root URL with scheme and host only."
            return
        }

        onApply(normalized)
        dismiss()
    }
}
