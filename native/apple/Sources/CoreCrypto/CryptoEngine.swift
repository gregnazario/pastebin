/// Core cryptography interfaces for native Apple clients.
///
/// This module will implement the production-compatible encryption contract
/// documented in `design-docs/native-swift-kotlin-architecture.md`.
public enum CryptoEngine {
    /// Current payload format version.
    public static let payloadVersion: UInt8 = 1
}
