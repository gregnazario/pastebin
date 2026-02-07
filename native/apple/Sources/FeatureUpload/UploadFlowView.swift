/// SwiftUI upload screen wired to UploadFeature orchestration.
import SwiftUI
import UniformTypeIdentifiers

public enum UploadInputMode: String, CaseIterable, Identifiable {
    case note
    case file

    public var id: String { rawValue }

    var title: String {
        switch self {
        case .note:
            return "Note"
        case .file:
            return "File"
        }
    }
}

@MainActor
public final class UploadFlowViewModel: ObservableObject {
    @Published public var inputMode: UploadInputMode = .note
    @Published public var noteText: String = ""
    @Published public var filename: String = "note.txt"
    @Published public var password: String = ""
    @Published public var encryptMetadata: Bool = false
    @Published public var selectedFileName: String?
    @Published public var selectedFileSizeBytes: Int?
    @Published public var isFileImporterPresented: Bool = false
    @Published public var isUploading: Bool = false
    @Published public var shareURLString: String?
    @Published public var errorMessage: String?

    private let uploadService: UploadFeature
    private var selectedFileBytes: [UInt8]?
    private var selectedFileMimeType: String?

    public init(uploadService: UploadFeature) {
        self.uploadService = uploadService
    }

    public var canUpload: Bool {
        guard !password.isEmpty else { return false }
        switch inputMode {
        case .note:
            return !noteText.isEmpty
        case .file:
            return selectedFileBytes != nil
        }
    }

    public func presentFileImporter() {
        isFileImporterPresented = true
    }

    public func handleFileImport(result: Result<URL, Error>) {
        do {
            let fileURL = try result.get()
            let needsScopedAccess = fileURL.startAccessingSecurityScopedResource()
            defer {
                if needsScopedAccess {
                    fileURL.stopAccessingSecurityScopedResource()
                }
            }

            let data = try Data(contentsOf: fileURL, options: [.mappedIfSafe])
            selectedFileBytes = [UInt8](data)
            selectedFileName = fileURL.lastPathComponent.isEmpty ? "file.bin" : fileURL.lastPathComponent
            selectedFileSizeBytes = data.count
            selectedFileMimeType = mimeType(for: fileURL)
            errorMessage = nil
        } catch {
            selectedFileBytes = nil
            selectedFileName = nil
            selectedFileSizeBytes = nil
            selectedFileMimeType = nil
            errorMessage = "Failed to read selected file."
        }
    }

    public func upload() {
        guard !isUploading else { return }

        let payload: UploadRequest
        switch inputMode {
        case .note:
            payload = .init(
                plaintext: [UInt8](noteText.utf8),
                filename: filename.isEmpty ? "note.txt" : filename,
                mimeType: "text/plain",
                password: password,
                encryptMetadata: encryptMetadata
            )
        case .file:
            guard let fileBytes = selectedFileBytes,
                  let fileName = selectedFileName,
                  let fileMimeType = selectedFileMimeType
            else {
                errorMessage = "Choose a file before uploading."
                return
            }
            payload = .init(
                plaintext: fileBytes,
                filename: fileName,
                mimeType: fileMimeType,
                password: password,
                encryptMetadata: encryptMetadata
            )
        }

        isUploading = true
        shareURLString = nil
        errorMessage = nil

        Task {
            do {
                let result = try await uploadService.upload(payload)
                shareURLString = result.shareURL.absoluteString
            } catch {
                errorMessage = error.localizedDescription
            }
            isUploading = false
        }
    }

    private func mimeType(for url: URL) -> String {
        let pathExtension = url.pathExtension
        if let type = UTType(filenameExtension: pathExtension),
           let mimeType = type.preferredMIMEType {
            return mimeType
        }
        return "application/octet-stream"
    }
}

public struct UploadFlowView: View {
    @StateObject private var viewModel: UploadFlowViewModel

    public init(viewModel: UploadFlowViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    public var body: some View {
        Form {
            Section("Input") {
                Picker("Mode", selection: $viewModel.inputMode) {
                    ForEach(UploadInputMode.allCases) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
            }

            if viewModel.inputMode == .note {
                Section("Note") {
                    TextField("Filename", text: $viewModel.filename)
                    TextEditor(text: $viewModel.noteText)
                        .frame(minHeight: 120)
                }
            } else {
                Section("File") {
                    Button("Choose File") {
                        viewModel.presentFileImporter()
                    }

                    if let selectedFileName = viewModel.selectedFileName {
                        Text(selectedFileName)
                            .font(.body)
                    }

                    if let fileSize = viewModel.selectedFileSizeBytes {
                        Text("\(fileSize) bytes")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Section("Security") {
                SecureField("Password", text: $viewModel.password)
                Toggle("Encrypt metadata", isOn: $viewModel.encryptMetadata)
            }

            Section {
                Button(viewModel.isUploading ? "Uploading..." : "Encrypt and Upload") {
                    viewModel.upload()
                }
                .disabled(viewModel.isUploading || !viewModel.canUpload)
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
        .fileImporter(
            isPresented: $viewModel.isFileImporterPresented,
            allowedContentTypes: [.data]
        ) { result in
            viewModel.handleFileImport(result: result)
        }
    }
}
