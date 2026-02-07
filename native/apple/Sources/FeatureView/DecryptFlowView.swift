/// SwiftUI decrypt screen wired to ViewFeature orchestration.
import AVKit
import CoreCrypto
import Foundation
#if canImport(AppKit)
import AppKit
#endif
#if canImport(PDFKit)
import PDFKit
#endif
import SwiftUI
import UniformTypeIdentifiers
#if canImport(UIKit)
import UIKit
#endif

public enum DecryptedPreview: Equatable {
    case text(String)
    case image(Data)
    case pdf(Data)
    case media(URL)
    case unsupported(String)
}

public struct DecryptedFileDocument: FileDocument {
    public static var readableContentTypes: [UTType] { [.data] }

    public let data: Data

    public init(data: Data) {
        self.data = data
    }

    public init(configuration: ReadConfiguration) throws {
        guard let fileData = configuration.file.regularFileContents else {
            throw CocoaError(.fileReadCorruptFile)
        }
        data = fileData
    }

    public func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

@MainActor
public final class DecryptFlowViewModel: ObservableObject {
    @Published public var shareURLString: String = ""
    @Published public var password: String = ""
    @Published public var isDecrypting: Bool = false
    @Published public var decryptedFileName: String?
    @Published public var decryptedPreview: DecryptedPreview?
    @Published public var isFileExporterPresented: Bool = false
    @Published public var exportDocument: DecryptedFileDocument?
    @Published public var shareExportURL: URL?
    @Published public var errorMessage: String?

    private let viewService: ViewFeature
    private var decryptedFileData: Data?
    private var decryptedFileMimeType: String?
    private var temporaryPreviewFileURL: URL?
    private var temporaryExportFileURL: URL?

    public init(viewService: ViewFeature) {
        self.viewService = viewService
    }

    public func decrypt() {
        guard !isDecrypting else { return }

        isDecrypting = true
        decryptedPreview = nil
        decryptedFileName = nil
        exportDocument = nil
        shareExportURL = nil
        errorMessage = nil
        decryptedFileData = nil
        decryptedFileMimeType = nil
        cleanupTemporaryFiles()

        Task {
            do {
                guard let url = URL(string: shareURLString) else {
                    throw DecryptServiceError.invalidShareURL
                }

                let result = try await viewService.decrypt(.init(shareURL: url, password: password))
                decryptedFileName = result.metadata.name
                decryptedFileData = Data(result.plaintext)
                decryptedFileMimeType = result.metadata.mimeType
                decryptedPreview = try makePreview(plaintext: result.plaintext, metadata: result.metadata)
                prepareShareURLIfPossible()
            } catch {
                errorMessage = error.localizedDescription
            }
            isDecrypting = false
        }
    }

    public var hasDecryptedFile: Bool {
        decryptedFileData != nil && decryptedFileName != nil
    }

    public var exportContentType: UTType {
        guard let decryptedFileMimeType,
              let type = UTType(mimeType: decryptedFileMimeType) else {
            return .data
        }
        return type
    }

    public func startSaveAs() {
        guard let decryptedFileData else {
            errorMessage = "Decrypt a file before saving."
            return
        }

        exportDocument = DecryptedFileDocument(data: decryptedFileData)
        isFileExporterPresented = true
    }

    public func handleFileExport(result: Result<URL, Error>) {
        if case .failure(let error) = result {
            errorMessage = error.localizedDescription
        }
    }

    private func makePreview(
        plaintext: [UInt8],
        metadata: CryptoFileMetadata
    ) throws -> DecryptedPreview {
        let mimeType = metadata.mimeType.lowercased()
        let data = Data(plaintext)

        if mimeType.hasPrefix("text/") {
            let text = String(decoding: plaintext, as: UTF8.self)
            return .text(text)
        }

        if mimeType.hasPrefix("image/") {
            guard isDecodableImage(data) else {
                return .unsupported("Image preview could not be decoded.")
            }
            return .image(data)
        }

        if mimeType == "application/pdf" {
            return .pdf(data)
        }

        if mimeType.hasPrefix("audio/") || mimeType.hasPrefix("video/") {
            let mediaURL = try writeTemporaryFile(
                data: data,
                fileName: metadata.name,
                mimeType: mimeType,
                prefix: "decrypt-preview-"
            )
            temporaryPreviewFileURL = mediaURL
            return .media(mediaURL)
        }

        return .unsupported("No preview available for \(metadata.mimeType).")
    }

    private func writeTemporaryFile(
        data: Data,
        fileName: String,
        mimeType: String,
        prefix: String
    ) throws -> URL {
        let fileManager = FileManager.default
        let originalExtension = URL(fileURLWithPath: fileName).pathExtension
        let pathExtension = originalExtension.isEmpty ? fallbackExtension(for: mimeType) : originalExtension

        var targetURL = fileManager.temporaryDirectory.appendingPathComponent("\(prefix)\(UUID().uuidString)")
        if !pathExtension.isEmpty {
            targetURL.appendPathExtension(pathExtension)
        }

        try data.write(to: targetURL, options: .atomic)
        return targetURL
    }

    private func prepareShareURLIfPossible() {
        guard let decryptedFileData,
              let decryptedFileName,
              let decryptedFileMimeType else {
            return
        }

        do {
            if let temporaryExportFileURL {
                try? FileManager.default.removeItem(at: temporaryExportFileURL)
            }
            let exportURL = try writeTemporaryFile(
                data: decryptedFileData,
                fileName: decryptedFileName,
                mimeType: decryptedFileMimeType,
                prefix: "decrypt-export-"
            )
            temporaryExportFileURL = exportURL
            shareExportURL = exportURL
        } catch {
            shareExportURL = nil
        }
    }

    public func cleanupTemporaryFiles() {
        if let temporaryPreviewFileURL {
            try? FileManager.default.removeItem(at: temporaryPreviewFileURL)
        }
        self.temporaryPreviewFileURL = nil

        if let temporaryExportFileURL {
            try? FileManager.default.removeItem(at: temporaryExportFileURL)
        }
        self.temporaryExportFileURL = nil
    }

    private func fallbackExtension(for mimeType: String) -> String {
        switch mimeType {
        case "video/mp4":
            return "mp4"
        case "video/quicktime":
            return "mov"
        case "audio/mpeg":
            return "mp3"
        case "audio/mp4":
            return "m4a"
        case "audio/wav", "audio/x-wav":
            return "wav"
        default:
            return ""
        }
    }

    private func isDecodableImage(_ data: Data) -> Bool {
#if canImport(UIKit)
        return UIImage(data: data) != nil
#elseif canImport(AppKit)
        return NSImage(data: data) != nil
#else
        return false
#endif
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

            if viewModel.hasDecryptedFile {
                Section("Actions") {
                    Button("Save As") {
                        viewModel.startSaveAs()
                    }

                    if let shareURL = viewModel.shareExportURL {
                        ShareLink("Export", item: shareURL)
                    }
                }
            }

            if let preview = viewModel.decryptedPreview {
                Section("Preview") {
                    previewView(preview)
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
        .fileExporter(
            isPresented: $viewModel.isFileExporterPresented,
            document: viewModel.exportDocument,
            contentType: viewModel.exportContentType,
            defaultFilename: viewModel.decryptedFileName ?? "decrypted"
        ) { result in
            viewModel.handleFileExport(result: result)
        }
        .onDisappear {
            viewModel.cleanupTemporaryFiles()
        }
    }

    @ViewBuilder
    private func previewView(_ preview: DecryptedPreview) -> some View {
        switch preview {
        case .text(let text):
            Text(text)
                .font(.footnote)
                .textSelection(.enabled)
        case .image(let data):
            PlatformImagePreview(data: data)
        case .pdf(let data):
#if canImport(PDFKit)
            PDFPreviewContainer(data: data)
                .frame(minHeight: 320)
#else
            Text("PDF preview is unavailable on this platform build.")
                .font(.footnote)
#endif
        case .media(let url):
            MediaPreviewContainer(url: url)
                .frame(minHeight: 240)
        case .unsupported(let message):
            Text(message)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
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

private struct MediaPreviewContainer: View {
    let url: URL

    var body: some View {
        VideoPlayer(player: AVPlayer(url: url))
    }
}

private struct PlatformImagePreview: View {
    let data: Data

    var body: some View {
#if canImport(UIKit)
        if let image = UIImage(data: data) {
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
                .frame(maxHeight: 300)
        } else {
            Text("Image preview could not be decoded.")
                .font(.footnote)
        }
#elseif canImport(AppKit)
        if let image = NSImage(data: data) {
            Image(nsImage: image)
                .resizable()
                .scaledToFit()
                .frame(maxHeight: 300)
        } else {
            Text("Image preview could not be decoded.")
                .font(.footnote)
        }
#else
        Text("Image preview is unavailable on this platform build.")
            .font(.footnote)
#endif
    }
}

#if canImport(PDFKit)
#if canImport(UIKit)
private struct PDFPreviewContainer: UIViewRepresentable {
    let data: Data

    func makeUIView(context: Context) -> PDFView {
        let view = PDFView()
        view.autoScales = true
        view.displayMode = .singlePageContinuous
        view.displayDirection = .vertical
        return view
    }

    func updateUIView(_ pdfView: PDFView, context: Context) {
        pdfView.document = PDFDocument(data: data)
    }
}
#elseif canImport(AppKit)
private struct PDFPreviewContainer: NSViewRepresentable {
    let data: Data

    func makeNSView(context: Context) -> PDFView {
        let view = PDFView()
        view.autoScales = true
        view.displayMode = .singlePageContinuous
        view.displayDirection = .vertical
        return view
    }

    func updateNSView(_ pdfView: PDFView, context: Context) {
        pdfView.document = PDFDocument(data: data)
    }
}
#endif
#endif
