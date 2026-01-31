import type { FileMetadata } from '../../types';
import { AESService } from './AESService';
import { KeyDerivationService } from './KeyDerivation';
import { KyberService } from './KyberService';

export interface EncryptedPayload {
  // Kyber encapsulated key
  kyberCiphertext: Uint8Array;
  // AES encrypted data
  aesCiphertext: Uint8Array;
  // Salt for key derivation
  salt: Uint8Array;
  // Metadata (may be encrypted)
  metadata: Uint8Array;
  metadataEncrypted: boolean;
  // Version for future compatibility
  version: number;
}

export interface EncryptionKeys {
  kyberPublicKey: Uint8Array;
  kyberPrivateKey: Uint8Array;
}

export class HybridEncryptionService {
  private static readonly VERSION = 1;
  private static readonly METADATA_KEY_INDEX = 1; // Use different key index for metadata

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
    try {
      // Step 1: Generate Kyber key pair
      const kyberKeys = await KyberService.generateKeyPair();

      // Step 2: Derive key from password
      const { key: derivedKey, salt } = await KeyDerivationService.deriveKey(password);

      // Step 3: Generate shared secret using Kyber encapsulation
      const { ciphertext: kyberCiphertext, sharedSecret } = await KyberService.encapsulate(
        kyberKeys.publicKey,
      );

      // Step 4: Combine derived key and Kyber shared secret for AES key
      // This provides defense in depth - both password and Kyber key are needed
      const combinedKey = await HybridEncryptionService.combineKeys(derivedKey, sharedSecret);

      // Step 5: Encrypt the actual data
      const aesCiphertext = await AESService.encryptCombined(data, combinedKey);

      // Step 6: Handle metadata
      let metadataBytes: Uint8Array;
      if (encryptMetadata) {
        // Derive a separate key for metadata encryption
        const metadataKey = await HybridEncryptionService.deriveMetadataKey(derivedKey, salt);
        const metadataJson = JSON.stringify(metadata);
        const metadataData = new TextEncoder().encode(metadataJson);
        metadataBytes = await AESService.encryptCombined(metadataData, metadataKey);
      } else {
        // Store metadata as plain JSON
        const metadataJson = JSON.stringify(metadata);
        metadataBytes = new TextEncoder().encode(metadataJson);
      }

      const payload: EncryptedPayload = {
        kyberCiphertext,
        aesCiphertext,
        salt,
        metadata: metadataBytes,
        metadataEncrypted: encryptMetadata,
        version: HybridEncryptionService.VERSION,
      };

      return {
        payload,
        keys: {
          kyberPublicKey: kyberKeys.publicKey,
          kyberPrivateKey: kyberKeys.privateKey,
        },
      };
    } catch (error) {
      throw new Error(
        `Hybrid encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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
    try {
      // Validate version
      if (payload.version !== HybridEncryptionService.VERSION) {
        throw new Error(`Unsupported payload version: ${payload.version}`);
      }

      // Step 1: Derive key from password and salt
      const derivedKey = await KeyDerivationService.deriveKeyCustom(
        password,
        payload.salt,
        KeyDerivationService['DEFAULT_ITERATIONS'],
        KeyDerivationService['DEFAULT_MEMORY'],
        KeyDerivationService['DEFAULT_PARALLELISM'],
      );

      // Step 2: Decapsulate Kyber to get shared secret
      const sharedSecret = await KyberService.decapsulate(payload.kyberCiphertext, kyberPrivateKey);

      // Step 3: Combine derived key and shared secret to get the same AES key
      const combinedKey = await HybridEncryptionService.combineKeys(derivedKey, sharedSecret);

      // Step 4: Decrypt the data
      const data = await AESService.decryptCombined(payload.aesCiphertext, combinedKey);

      // Step 5: Handle metadata
      let metadata: FileMetadata;
      if (payload.metadataEncrypted) {
        const metadataKey = await HybridEncryptionService.deriveMetadataKey(
          derivedKey,
          payload.salt,
        );
        const metadataData = await AESService.decryptCombined(payload.metadata, metadataKey);
        const metadataJson = new TextDecoder().decode(metadataData);
        metadata = JSON.parse(metadataJson);
      } else {
        const metadataJson = new TextDecoder().decode(payload.metadata);
        metadata = JSON.parse(metadataJson);
      }

      return { data, metadata };
    } catch (error) {
      throw new Error(
        `Hybrid decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Combine password-derived key and Kyber-derived key
   * @param derivedKey - Key derived from password
   * @param kyberKey - Key from Kyber
   * @returns Combined key for AES
   */
  private static async combineKeys(
    derivedKey: Uint8Array,
    kyberKey: Uint8Array,
  ): Promise<Uint8Array> {
    // XOR the keys together for a simple combination
    // In production, consider using HKDF for key derivation
    const combined = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      combined[i] = derivedKey[i % derivedKey.length] ^ kyberKey[i % kyberKey.length];
    }
    return combined;
  }

  /**
   * Derive a separate key for metadata encryption
   * @param mainKey - The main derived key
   * @param salt - The salt used
   * @returns Metadata encryption key
   */
  private static async deriveMetadataKey(
    mainKey: Uint8Array,
    salt: Uint8Array,
  ): Promise<Uint8Array> {
    // Use a different context to derive metadata key
    const metadataSalt = new Uint8Array(salt.length);
    for (let i = 0; i < salt.length; i++) {
      metadataSalt[i] = salt[i] ^ HybridEncryptionService.METADATA_KEY_INDEX;
    }

    // Simple derivation - in production use HKDF
    const combined = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      combined[i] = mainKey[i % mainKey.length] ^ metadataSalt[i % metadataSalt.length];
    }
    return combined;
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

    const flags = payload.metadataEncrypted ? 0x01 : 0x00;

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
      payload.metadata.length;

    const buffer = new Uint8Array(totalSize);
    let offset = 0;

    // Version
    buffer[offset++] = payload.version;

    // Flags
    buffer[offset++] = flags;

    // Salt
    buffer[offset++] = (payload.salt.length >> 8) & 0xff;
    buffer[offset++] = payload.salt.length & 0xff;
    buffer.set(payload.salt, offset);
    offset += payload.salt.length;

    // Kyber ciphertext
    buffer[offset++] = (payload.kyberCiphertext.length >> 8) & 0xff;
    buffer[offset++] = payload.kyberCiphertext.length & 0xff;
    buffer.set(payload.kyberCiphertext, offset);
    offset += payload.kyberCiphertext.length;

    // AES ciphertext
    buffer[offset++] = (payload.aesCiphertext.length >> 24) & 0xff;
    buffer[offset++] = (payload.aesCiphertext.length >> 16) & 0xff;
    buffer[offset++] = (payload.aesCiphertext.length >> 8) & 0xff;
    buffer[offset++] = payload.aesCiphertext.length & 0xff;
    buffer.set(payload.aesCiphertext, offset);
    offset += payload.aesCiphertext.length;

    // Metadata
    buffer[offset++] = (payload.metadata.length >> 24) & 0xff;
    buffer[offset++] = (payload.metadata.length >> 16) & 0xff;
    buffer[offset++] = (payload.metadata.length >> 8) & 0xff;
    buffer[offset++] = payload.metadata.length & 0xff;
    buffer.set(payload.metadata, offset);

    return buffer;
  }

  /**
   * Deserialize encrypted payload from storage
   * @param buffer - The serialized bytes
   * @returns Encrypted payload
   */
  static deserializePayload(buffer: Uint8Array): EncryptedPayload {
    let offset = 0;

    // Version
    const version = buffer[offset++];

    // Flags
    const flags = buffer[offset++];
    const metadataEncrypted = (flags & 0x01) !== 0;

    // Salt
    const saltLen = (buffer[offset++] << 8) | buffer[offset++];
    const salt = buffer.slice(offset, offset + saltLen);
    offset += saltLen;

    // Kyber ciphertext
    const kyberLen = (buffer[offset++] << 8) | buffer[offset++];
    const kyberCiphertext = buffer.slice(offset, offset + kyberLen);
    offset += kyberLen;

    // AES ciphertext
    const aesLen =
      (buffer[offset++] << 24) |
      (buffer[offset++] << 16) |
      (buffer[offset++] << 8) |
      buffer[offset++];
    const aesCiphertext = buffer.slice(offset, offset + aesLen);
    offset += aesLen;

    // Metadata
    const metadataLen =
      (buffer[offset++] << 24) |
      (buffer[offset++] << 16) |
      (buffer[offset++] << 8) |
      buffer[offset++];
    const metadata = buffer.slice(offset, offset + metadataLen);

    return {
      version,
      metadataEncrypted,
      salt,
      kyberCiphertext,
      aesCiphertext,
      metadata,
    };
  }
}
