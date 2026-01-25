import { gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/ciphers/utils';

export interface AESEncryptionResult {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
}

export class AESService {
  private static readonly KEY_SIZE = 32; // 256 bits
  private static readonly NONCE_SIZE = 12; // 96 bits (standard for GCM)
  private static readonly TAG_SIZE = 16; // 128 bits

  /**
   * Encrypt data using AES-256-GCM
   * @param data - The data to encrypt
   * @param key - The encryption key (32 bytes)
   * @param additionalData - Optional additional authenticated data
   * @returns Promise with ciphertext, nonce, and tag
   */
  static async encrypt(
    data: Uint8Array,
    key: Uint8Array,
    additionalData?: Uint8Array,
  ): Promise<AESEncryptionResult> {
    try {
      // Validate key size
      if (key.length !== this.KEY_SIZE) {
        throw new Error(`Invalid key size: expected ${this.KEY_SIZE} bytes, got ${key.length}`);
      }

      // Generate random nonce
      const nonce = randomBytes(this.NONCE_SIZE);
      
      // Create cipher instance
      const cipher = gcm(key, nonce, additionalData);
      
      // Encrypt the data
      const ciphertext = cipher.encrypt(data);
      
      return {
        ciphertext,
        nonce,
        tag: new Uint8Array(0), // Tag is included in ciphertext for @noble/ciphers
      };
    } catch (error) {
      throw new Error(`AES encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param ciphertext - The encrypted data
   * @param key - The decryption key (32 bytes)
   * @param nonce - The nonce used for encryption
   * @param additionalData - Optional additional authenticated data
   * @returns Promise with decrypted data
   */
  static async decrypt(
    ciphertext: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array,
    additionalData?: Uint8Array,
  ): Promise<Uint8Array> {
    try {
      // Validate inputs
      if (key.length !== this.KEY_SIZE) {
        throw new Error(`Invalid key size: expected ${this.KEY_SIZE} bytes, got ${key.length}`);
      }
      
      if (nonce.length !== this.NONCE_SIZE) {
        throw new Error(`Invalid nonce size: expected ${this.NONCE_SIZE} bytes, got ${nonce.length}`);
      }

      // Create cipher instance
      const cipher = gcm(key, nonce, additionalData);
      
      // Decrypt the data
      const plaintext = cipher.decrypt(ciphertext);
      
      return plaintext;
    } catch (error) {
      throw new Error(`AES decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a random AES key
   * @returns Random 256-bit key
   */
  static generateKey(): Uint8Array {
    return randomBytes(this.KEY_SIZE);
  }

  /**
   * Encrypt with a combined output format (nonce + ciphertext)
   * @param data - The data to encrypt
   * @param key - The encryption key
   * @param additionalData - Optional additional authenticated data
   * @returns Combined output with nonce prepended to ciphertext
   */
  static async encryptCombined(
    data: Uint8Array,
    key: Uint8Array,
    additionalData?: Uint8Array,
  ): Promise<Uint8Array> {
    const { ciphertext, nonce } = await this.encrypt(data, key, additionalData);
    
    // Combine nonce and ciphertext
    const combined = new Uint8Array(nonce.length + ciphertext.length);
    combined.set(nonce, 0);
    combined.set(ciphertext, nonce.length);
    
    return combined;
  }

  /**
   * Decrypt from a combined format (nonce + ciphertext)
   * @param combined - The combined nonce and ciphertext
   * @param key - The decryption key
   * @param additionalData - Optional additional authenticated data
   * @returns Decrypted data
   */
  static async decryptCombined(
    combined: Uint8Array,
    key: Uint8Array,
    additionalData?: Uint8Array,
  ): Promise<Uint8Array> {
    if (combined.length < this.NONCE_SIZE) {
      throw new Error('Combined data too short to contain nonce');
    }
    
    // Extract nonce and ciphertext
    const nonce = combined.slice(0, this.NONCE_SIZE);
    const ciphertext = combined.slice(this.NONCE_SIZE);
    
    return this.decrypt(ciphertext, key, nonce, additionalData);
  }

  /**
   * Get size parameters
   * @returns Object with size information
   */
  static getSizes() {
    return {
      keySize: this.KEY_SIZE,
      nonceSize: this.NONCE_SIZE,
      tagSize: this.TAG_SIZE,
    };
  }
}