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

@MainActor
public final class DecryptFlowViewModel: ObservableObject {
    @Published public var shareURLString: String = ""
    @Published public var password: String = ""
    @Published public var isDecrypting: Bool = false
    @Published public var decryptedFileName: String?
    @Published public var decryptedPreview: DecryptedPreview?
    @Published public var errorMessage: String?

    private let viewService: ViewFeature
    private var temporaryPreviewFileURL: URL?

    public init(viewService: ViewFeature) {
        self.viewService = viewService
    }

    public func decrypt() {
        guard !isDecrypting else { return }

        isDecrypting = true
        decryptedPreview = nil
        decryptedFileName = nil
        errorMessage = nil
        cleanupTemporaryPreviewFile()

        Task {
            do {
                guard let url = URL(string: shareURLString) else {
                    throw DecryptServiceError.invalidShareURL
                }

                let result = try await viewService.decrypt(.init(shareURL: url, password: password))
                decryptedFileName = result.metadata.name
                decryptedPreview = try makePreview(plaintext: result.plaintext, metadata: result.metadata)
            } catch {
                errorMessage = error.localizedDescription
            }
            isDecrypting = false
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
            let mediaURL = try writeTemporaryPreviewFile(
                data: data,
                fileName: metadata.name,
                mimeType: mimeType
            )
            temporaryPreviewFileURL = mediaURL
            return .media(mediaURL)
        }

        return .unsupported("No preview available for \(metadata.mimeType).")
    }

    private func writeTemporaryPreviewFile(
        data: Data,
        fileName: String,
        mimeType: String
    ) throws -> URL {
        let fileManager = FileManager.default
        let originalExtension = URL(fileURLWithPath: fileName).pathExtension
        let pathExtension = originalExtension.isEmpty ? fallbackExtension(for: mimeType) : originalExtension

        var targetURL = fileManager.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        if !pathExtension.isEmpty {
            targetURL.appendPathExtension(pathExtension)
        }

        try data.write(to: targetURL, options: .atomic)
        return targetURL
    }

    private func cleanupTemporaryPreviewFile() {
        guard let temporaryPreviewFileURL else { return }
        try? FileManager.default.removeItem(at: temporaryPreviewFileURL)
        self.temporaryPreviewFileURL = nil
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
