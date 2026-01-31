import { argon2id } from 'hash-wasm';

export interface DerivedKeyResult {
  key: Uint8Array;
  salt: Uint8Array;
  parameters: {
    iterations: number;
    memory: number;
    parallelism: number;
    hashLength: number;
  };
}

export class KeyDerivationService {
  // Default parameters for Argon2id
  private static readonly DEFAULT_ITERATIONS = 3;
  private static readonly DEFAULT_MEMORY = 64 * 1024; // 64MB in KB
  private static readonly DEFAULT_PARALLELISM = 1;
  private static readonly DEFAULT_HASH_LENGTH = 32; // 256 bits
  private static readonly SALT_LENGTH = 32; // 256 bits

  /**
   * Derive a key from a password using Argon2id
   * @param password - The password to derive from
   * @param salt - Optional salt (will generate if not provided)
   * @returns Promise with derived key and parameters
   */
  static async deriveKey(password: string, salt?: Uint8Array): Promise<DerivedKeyResult> {
    // Generate salt if not provided
    if (!salt) {
      salt = crypto.getRandomValues(new Uint8Array(KeyDerivationService.SALT_LENGTH));
    }

    try {
      const hashHex = await argon2id({
        password,
        salt,
        iterations: KeyDerivationService.DEFAULT_ITERATIONS,
        memorySize: KeyDerivationService.DEFAULT_MEMORY,
        parallelism: KeyDerivationService.DEFAULT_PARALLELISM,
        hashLength: KeyDerivationService.DEFAULT_HASH_LENGTH,
        outputType: 'hex',
      });

      // Convert hex to Uint8Array
      const key = KeyDerivationService.hexToBytes(hashHex);

      return {
        key,
        salt,
        parameters: {
          iterations: KeyDerivationService.DEFAULT_ITERATIONS,
          memory: KeyDerivationService.DEFAULT_MEMORY,
          parallelism: KeyDerivationService.DEFAULT_PARALLELISM,
          hashLength: KeyDerivationService.DEFAULT_HASH_LENGTH,
        },
      };
    } catch (error) {
      throw new Error(
        `Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Derive a key with custom parameters
   * @param password - The password to derive from
   * @param salt - The salt to use
   * @param iterations - Number of iterations
   * @param memory - Memory usage in KB
   * @param parallelism - Degree of parallelism
   * @returns Promise with derived key
   */
  static async deriveKeyCustom(
    password: string,
    salt: Uint8Array,
    iterations: number,
    memory: number,
    parallelism: number,
  ): Promise<Uint8Array> {
    try {
      const hashHex = await argon2id({
        password,
        salt,
        iterations,
        memorySize: memory,
        parallelism,
        hashLength: KeyDerivationService.DEFAULT_HASH_LENGTH,
        outputType: 'hex',
      });

      return KeyDerivationService.hexToBytes(hashHex);
    } catch (error) {
      throw new Error(
        `Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Convert hex string to Uint8Array
   */
  private static hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  /**
   * Generate a random salt
   * @returns Random salt as Uint8Array
   */
  static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(KeyDerivationService.SALT_LENGTH));
  }

  /**
   * Convert derived key to base64url format (for URL fragments)
   * @param key - The key to encode
   * @returns Base64url encoded string
   */
  static keyToBase64Url(key: Uint8Array): string {
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(key)));
    // Convert to base64url by replacing characters
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Convert base64url back to Uint8Array
   * @param base64url - Base64url encoded string
   * @returns Decoded key as Uint8Array
   */
  static base64UrlToKey(base64url: string): Uint8Array {
    // Convert from base64url to base64
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if necessary
    const padding = base64.length % 4;
    if (padding) {
      base64 += '='.repeat(4 - padding);
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
