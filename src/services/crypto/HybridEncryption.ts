import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import type { FileMetadata } from '../../types'
import { AESService } from './AESService'
import { KeyDerivationService } from './KeyDerivation'
import { KyberService } from './KyberService'
import { secureClearAll } from './SecureMemory'

export interface EncryptedPayload {
  // Kyber encapsulated key
  kyberCiphertext: Uint8Array
  // AES encrypted data
  aesCiphertext: Uint8Array
  // Salt for key derivation
  salt: Uint8Array
  // Metadata (may be encrypted)
  metadata: Uint8Array
  metadataEncrypted: boolean
  // Version for future compatibility
  version: number
}

export interface EncryptionKeys {
  kyberPublicKey: Uint8Array
  kyberPrivateKey: Uint8Array
}

export class HybridEncryptionService {
  private static readonly VERSION = 1

  /**
   * Encrypt data using hybrid Kyber + AES-GCM encryption
   * @param data - The data to encrypt
   * @param password - The password for key derivation
   * @param metadata - File metadata
   * @param encryptMetadata - Whether to encrypt metadata
   * @returns Promise with encrypted payload and keys
   */
  static async encrypt(
    data: Uint8Array,
    password: string,
    metadata: FileMetadata,
    encryptMetadata: boolean = false,
  ): Promise<{ payload: EncryptedPayload; keys: EncryptionKeys }> {
    // Track sensitive data for cleanup
    let derivedKey: Uint8Array | undefined
    let sharedSecret: Uint8Array | undefined
    let combinedKey: Uint8Array | undefined
    let metadataKey: Uint8Array | undefined

    try {
      // Step 1: Generate Kyber key pair
      const kyberKeys = await KyberService.generateKeyPair()

      // Step 2: Derive key from password
      const derivationResult = await KeyDerivationService.deriveKey(password)
      derivedKey = derivationResult.key
      const salt = derivationResult.salt

      // Step 3: Generate shared secret using Kyber encapsulation
      const encapsulation = await KyberService.encapsulate(kyberKeys.publicKey)
      const kyberCiphertext = encapsulation.ciphertext
      sharedSecret = encapsulation.sharedSecret

      // Step 4: Combine derived key and Kyber shared secret for AES key
      // This provides defense in depth - both password and Kyber key are needed
      combinedKey = await HybridEncryptionService.combineKeys(derivedKey, sharedSecret)

      // Step 5: Encrypt the actual data
      const aesCiphertext = await AESService.encryptCombined(data, combinedKey)

      // Step 6: Handle metadata
      let metadataBytes: Uint8Array
      if (encryptMetadata) {
        // Derive a separate key for metadata encryption
        metadataKey = await HybridEncryptionService.deriveMetadataKey(derivedKey, salt)
        const metadataJson = JSON.stringify(metadata)
        const metadataData = new TextEncoder().encode(metadataJson)
        metadataBytes = await AESService.encryptCombined(metadataData, metadataKey)
      } else {
        // Store metadata as plain JSON
        const metadataJson = JSON.stringify(metadata)
        metadataBytes = new TextEncoder().encode(metadataJson)
      }

      const payload: EncryptedPayload = {
        kyberCiphertext,
        aesCiphertext,
        salt,
        metadata: metadataBytes,
        metadataEncrypted: encryptMetadata,
        version: HybridEncryptionService.VERSION,
      }

      return {
        payload,
        keys: {
          kyberPublicKey: kyberKeys.publicKey,
          kyberPrivateKey: kyberKeys.privateKey,
        },
      }
    } catch (error) {
      throw new Error(
        `Hybrid encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    } finally {
      // Clear sensitive key material from memory
      secureClearAll(derivedKey, sharedSecret, combinedKey, metadataKey)
    }
  }

  /**
   * Decrypt data using hybrid Kyber + AES-GCM decryption
   * @param payload - The encrypted payload
   * @param password - The password for key derivation
   * @param kyberPrivateKey - The Kyber private key
   * @returns Promise with decrypted data and metadata
   */
  static async decrypt(
    payload: EncryptedPayload,
    password: string,
    kyberPrivateKey: Uint8Array,
  ): Promise<{ data: Uint8Array; metadata: FileMetadata }> {
    // Track sensitive data for cleanup
    let derivedKey: Uint8Array | undefined
    let sharedSecret: Uint8Array | undefined
    let combinedKey: Uint8Array | undefined
    let metadataKey: Uint8Array | undefined

    try {
      // Validate version
      if (payload.version !== HybridEncryptionService.VERSION) {
        throw new Error(`Unsupported payload version: ${payload.version}`)
      }

      // Step 1: Derive key from password and salt
      derivedKey = await KeyDerivationService.deriveKeyCustom(
        password,
        payload.salt,
        KeyDerivationService.DEFAULT_ITERATIONS,
        KeyDerivationService.DEFAULT_MEMORY,
        KeyDerivationService.DEFAULT_PARALLELISM,
      )

      // Step 2: Decapsulate Kyber to get shared secret
      sharedSecret = await KyberService.decapsulate(payload.kyberCiphertext, kyberPrivateKey)

      // Step 3: Combine derived key and shared secret to get the same AES key
      combinedKey = await HybridEncryptionService.combineKeys(derivedKey, sharedSecret)

      // Step 4: Decrypt the data
      const data = await AESService.decryptCombined(payload.aesCiphertext, combinedKey)

      // Step 5: Handle metadata
      let metadata: FileMetadata
      try {
        if (payload.metadataEncrypted) {
          metadataKey = await HybridEncryptionService.deriveMetadataKey(
            derivedKey,
            payload.salt,
          )
          const metadataData = await AESService.decryptCombined(payload.metadata, metadataKey)
          const metadataJson = new TextDecoder().decode(metadataData)
          metadata = JSON.parse(metadataJson)
        } else {
          const metadataJson = new TextDecoder().decode(payload.metadata)
          metadata = JSON.parse(metadataJson)
        }
      } catch {
        throw new Error('Failed to parse metadata: invalid or corrupted data')
      }

      return { data, metadata }
    } catch (error) {
      throw new Error(
        `Hybrid decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    } finally {
      // Clear sensitive key material from memory
      secureClearAll(derivedKey, sharedSecret, combinedKey, metadataKey)
    }
  }

  /**
   * Combine password-derived key and Kyber-derived key using HKDF
   * This provides cryptographically secure key combination with domain separation
   * @param derivedKey - Key derived from password
   * @param kyberKey - Key from Kyber
   * @returns Combined key for AES
   */
  private static async combineKeys(
    derivedKey: Uint8Array,
    kyberKey: Uint8Array,
  ): Promise<Uint8Array> {
    // Concatenate both keys as input keying material (IKM)
    const inputMaterial = new Uint8Array(derivedKey.length + kyberKey.length)
    inputMaterial.set(derivedKey, 0)
    inputMaterial.set(kyberKey, derivedKey.length)

    // Use HKDF with SHA-256 to derive a secure combined key
    // - salt: random bytes for additional security (using empty for deterministic derivation)
    // - info: context bytes for domain separation
    const info = new TextEncoder().encode('pastebin-hybrid-key-v1')
    const combined = hkdf(sha256, inputMaterial, new Uint8Array(32), info, 32)
    return combined
  }

  /**
   * Derive a separate key for metadata encryption using HKDF
   * Uses domain separation to ensure metadata key is cryptographically independent
   * @param mainKey - The main derived key
   * @param salt - The salt used for additional entropy
   * @returns Metadata encryption key
   */
  private static async deriveMetadataKey(
    mainKey: Uint8Array,
    salt: Uint8Array,
  ): Promise<Uint8Array> {
    // Use HKDF with a distinct context string for metadata encryption
    // This provides proper domain separation from the main encryption key
    const info = new TextEncoder().encode('pastebin-metadata-key-v1')
    const metadataKey = hkdf(sha256, mainKey, salt, info, 32)
    return metadataKey
  }

  /**
   * Serialize encrypted payload for storage
   * @param payload - The encrypted payload
   * @returns Serialized bytes
   */
  static serializePayload(payload: EncryptedPayload): Uint8Array {
    // Create a simple binary format:
    // [version(1)] [flags(1)] [salt_len(2)] [salt] [kyber_len(2)] [kyber]
    // [aes_len(4)] [aes] [metadata_len(4)] [metadata]

    const flags = payload.metadataEncrypted ? 0x01 : 0x00

    const totalSize =
      1 +
      1 +
      2 +
      payload.salt.length +
      2 +
      payload.kyberCiphertext.length +
      4 +
      payload.aesCiphertext.length +
      4 +
      payload.metadata.length

    const buffer = new Uint8Array(totalSize)
    let offset = 0

    // Version
    buffer[offset++] = payload.version

    // Flags
    buffer[offset++] = flags

    // Salt
    buffer[offset++] = (payload.salt.length >> 8) & 0xff
    buffer[offset++] = payload.salt.length & 0xff
    buffer.set(payload.salt, offset)
    offset += payload.salt.length

    // Kyber ciphertext
    buffer[offset++] = (payload.kyberCiphertext.length >> 8) & 0xff
    buffer[offset++] = payload.kyberCiphertext.length & 0xff
    buffer.set(payload.kyberCiphertext, offset)
    offset += payload.kyberCiphertext.length

    // AES ciphertext
    buffer[offset++] = (payload.aesCiphertext.length >> 24) & 0xff
    buffer[offset++] = (payload.aesCiphertext.length >> 16) & 0xff
    buffer[offset++] = (payload.aesCiphertext.length >> 8) & 0xff
    buffer[offset++] = payload.aesCiphertext.length & 0xff
    buffer.set(payload.aesCiphertext, offset)
    offset += payload.aesCiphertext.length

    // Metadata
    buffer[offset++] = (payload.metadata.length >> 24) & 0xff
    buffer[offset++] = (payload.metadata.length >> 16) & 0xff
    buffer[offset++] = (payload.metadata.length >> 8) & 0xff
    buffer[offset++] = payload.metadata.length & 0xff
    buffer.set(payload.metadata, offset)

    return buffer
  }

  /**
   * Deserialize encrypted payload from storage with bounds checking
   * @param buffer - The serialized bytes
   * @returns Encrypted payload
   * @throws Error if payload is malformed or invalid
   */
  static deserializePayload(buffer: Uint8Array): EncryptedPayload {
    // Minimum header size: version(1) + flags(1) + salt_len(2) + kyber_len(2) + aes_len(4) + metadata_len(4) = 14 bytes
    const MIN_HEADER_SIZE = 14

    if (buffer.length < MIN_HEADER_SIZE) {
      throw new Error('Invalid payload: buffer too short for header')
    }

    let offset = 0

    /**
     * Safely read bytes from buffer with bounds checking
     * @param count - Number of bytes to read
     * @returns The bytes read
     * @throws Error if not enough bytes available
     */
    const safeRead = (count: number): Uint8Array => {
      if (offset + count > buffer.length) {
        throw new Error(
          `Invalid payload: insufficient data at offset ${offset} (need ${count} bytes, have ${buffer.length - offset})`,
        )
      }
      const result = buffer.slice(offset, offset + count)
      offset += count
      return result
    }

    /**
     * Safely read a 2-byte big-endian length value
     */
    const readLength2 = (): number => {
      const bytes = safeRead(2)
      return (bytes[0] << 8) | bytes[1]
    }

    /**
     * Safely read a 4-byte big-endian length value
     */
    const readLength4 = (): number => {
      const bytes = safeRead(4)
      return (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]
    }

    // Version
    const version = safeRead(1)[0]

    // Validate version
    if (version !== HybridEncryptionService.VERSION) {
      throw new Error(`Unsupported payload version: ${version} (expected ${HybridEncryptionService.VERSION})`)
    }

    // Flags
    const flags = safeRead(1)[0]
    const metadataEncrypted = (flags & 0x01) !== 0

    // Salt (2-byte length prefix)
    const saltLen = readLength2()
    if (saltLen === 0 || saltLen > 64) {
      throw new Error(`Invalid payload: salt length out of range (${saltLen})`)
    }
    const salt = safeRead(saltLen)

    // Kyber ciphertext (2-byte length prefix)
    const kyberLen = readLength2()
    // Kyber768 ciphertext is exactly 1088 bytes
    const expectedKyberLen = 1088
    if (kyberLen !== expectedKyberLen) {
      throw new Error(
        `Invalid payload: kyber ciphertext size mismatch (expected ${expectedKyberLen}, got ${kyberLen})`,
      )
    }
    const kyberCiphertext = safeRead(kyberLen)

    // AES ciphertext (4-byte length prefix)
    const aesLen = readLength4()
    if (aesLen === 0) {
      throw new Error('Invalid payload: AES ciphertext cannot be empty')
    }
    // Sanity check: AES ciphertext shouldn't be larger than 1GB
    if (aesLen > 1024 * 1024 * 1024) {
      throw new Error('Invalid payload: AES ciphertext size exceeds maximum')
    }
    const aesCiphertext = safeRead(aesLen)

    // Metadata (4-byte length prefix)
    const metadataLen = readLength4()
    if (metadataLen === 0) {
      throw new Error('Invalid payload: metadata cannot be empty')
    }
    // Sanity check: metadata shouldn't be larger than 1MB
    if (metadataLen > 1024 * 1024) {
      throw new Error('Invalid payload: metadata size exceeds maximum')
    }
    const metadata = safeRead(metadataLen)

    // Verify we consumed the entire buffer (no trailing garbage)
    if (offset !== buffer.length) {
      throw new Error(
        `Invalid payload: ${buffer.length - offset} unexpected trailing bytes`,
      )
    }

    return {
      version,
      metadataEncrypted,
      salt,
      kyberCiphertext,
      aesCiphertext,
      metadata,
    }
  }
}
