/// Runtime settings sheet for configuring demo app connectivity.
import Foundation
import SwiftUI

struct DemoSettingsView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var draftAPIBaseURLString: String
    @State private var validationMessage: String?

    private let onApply: (String) -> Void
    private let defaultAPIBaseURLString = "http://127.0.0.1:3000"

    init(
        currentAPIBaseURLString: String,
        onApply: @escaping (String) -> Void
    ) {
        _draftAPIBaseURLString = State(initialValue: currentAPIBaseURLString)
        self.onApply = onApply
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("API") {
                    TextField("Base URL", text: $draftAPIBaseURLString)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                        .keyboardType(.URL)
                    Text("Example: \(defaultAPIBaseURLString)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                if let validationMessage {
                    Section("Error") {
                        Text(validationMessage)
                            .foregroundStyle(.red)
                    }
                }

                Section("Actions") {
                    Button("Use Local Default") {
                        draftAPIBaseURLString = defaultAPIBaseURLString
                        validationMessage = nil
                    }
                }
            }
            .navigationTitle("Demo Settings")
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
