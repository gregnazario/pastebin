/// Networking abstraction for Secure Pastebin native API v1.
public protocol APIClient {
    /// Executes an upload request against `/api/v1/upload`.
    func uploadEncryptedBlob(data: [UInt8], filename: String) async throws -> (id: String, expiresAt: Int64)

    /// Executes a download request against `/api/v1/download`.
    func downloadEncryptedBlob(id: String) async throws -> [UInt8]

    /// Checks `/api/v1/health`.
    func health() async throws -> (configured: Bool, account: String?)
}
