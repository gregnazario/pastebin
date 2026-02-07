/// SwiftUI decrypt screen wired to ViewFeature orchestration.
import SwiftUI

@MainActor
public final class DecryptFlowViewModel: ObservableObject {
    @Published public var shareURLString: String = ""
    @Published public var password: String = ""
    @Published public var isDecrypting: Bool = false
    @Published public var decryptedTextPreview: String?
    @Published public var decryptedFileName: String?
    @Published public var errorMessage: String?

    private let viewService: ViewFeature

    public init(viewService: ViewFeature) {
        self.viewService = viewService
    }

    public func decrypt() {
        guard !isDecrypting else { return }

        isDecrypting = true
        decryptedTextPreview = nil
        decryptedFileName = nil
        errorMessage = nil

        Task {
            do {
                guard let url = URL(string: shareURLString) else {
                    throw DecryptServiceError.invalidShareURL
                }

                let result = try await viewService.decrypt(.init(shareURL: url, password: password))
                decryptedFileName = result.metadata.name
                decryptedTextPreview = String(bytes: result.plaintext, encoding: .utf8) ?? "<binary data>"
            } catch {
                errorMessage = error.localizedDescription
            }
            isDecrypting = false
        }
    }
}

public struct DecryptFlowView: View {
    @StateObject private var viewModel: DecryptFlowViewModel

    public init(viewModel: DecryptFlowViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    public var body: some View {
        Form {
            Section("Decrypt") {
                shareURLTextField
                SecureField("Password", text: $viewModel.password)
            }

            Section {
                Button(viewModel.isDecrypting ? "Decrypting..." : "Download and Decrypt") {
                    viewModel.decrypt()
                }
                .disabled(viewModel.isDecrypting || viewModel.shareURLString.isEmpty || viewModel.password.isEmpty)
            }

            if let fileName = viewModel.decryptedFileName {
                Section("Decrypted File") {
                    Text(fileName)
                        .font(.headline)
                }
            }

            if let preview = viewModel.decryptedTextPreview {
                Section("Preview") {
                    Text(preview)
                        .font(.footnote)
                        .textSelection(.enabled)
                }
            }

            if let error = viewModel.errorMessage {
                Section("Error") {
                    Text(error)
                        .foregroundStyle(.red)
                }
            }
        }
        .navigationTitle("Decrypt")
    }

    @ViewBuilder
    private var shareURLTextField: some View {
        let field = TextField("Share URL", text: $viewModel.shareURLString)
#if os(iOS)
        field
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(true)
#else
        field
#endif
    }
}
