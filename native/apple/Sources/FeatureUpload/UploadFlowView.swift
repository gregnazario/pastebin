/// SwiftUI upload screen wired to UploadFeature orchestration.
import SwiftUI

@MainActor
public final class UploadFlowViewModel: ObservableObject {
    @Published public var noteText: String = ""
    @Published public var filename: String = "note.txt"
    @Published public var password: String = ""
    @Published public var encryptMetadata: Bool = false
    @Published public var isUploading: Bool = false
    @Published public var shareURLString: String?
    @Published public var errorMessage: String?

    private let uploadService: UploadFeature

    public init(uploadService: UploadFeature) {
        self.uploadService = uploadService
    }

    public func uploadNote() {
        guard !isUploading else { return }

        isUploading = true
        shareURLString = nil
        errorMessage = nil

        Task {
            do {
                let result = try await uploadService.upload(
                    .init(
                        plaintext: [UInt8](noteText.utf8),
                        filename: filename.isEmpty ? "note.txt" : filename,
                        mimeType: "text/plain",
                        password: password,
                        encryptMetadata: encryptMetadata
                    )
                )
                shareURLString = result.shareURL.absoluteString
            } catch {
                errorMessage = error.localizedDescription
            }
            isUploading = false
        }
    }
}

public struct UploadFlowView: View {
    @StateObject private var viewModel: UploadFlowViewModel

    public init(viewModel: UploadFlowViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    public var body: some View {
        Form {
            Section("Note") {
                TextField("Filename", text: $viewModel.filename)
                TextEditor(text: $viewModel.noteText)
                    .frame(minHeight: 120)
            }

            Section("Security") {
                SecureField("Password", text: $viewModel.password)
                Toggle("Encrypt metadata", isOn: $viewModel.encryptMetadata)
            }

            Section {
                Button(viewModel.isUploading ? "Uploading..." : "Encrypt and Upload") {
                    viewModel.uploadNote()
                }
                .disabled(viewModel.isUploading || viewModel.noteText.isEmpty || viewModel.password.isEmpty)
            }

            if let url = viewModel.shareURLString {
                Section("Share Link") {
                    Text(url)
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
        .navigationTitle("Upload")
    }
}
