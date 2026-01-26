/**
 * Browser-compatible key derivation service
 * Uses Web Crypto API instead of argon2-browser to avoid WASM issues
 */

export interface DerivedKeyResult {
  key: Uint8Array;
  salt: Uint8Array;
}

export class KeyDerivationService {
  // Use PBKDF2 for browser compatibility (not as secure as Argon2, but works)
  private static readonly ITERATIONS = 100000;
  private static readonly KEY_LENGTH = 32; // 256 bits
  
  /**
   * Derive a key from password
   * @param password - The password to derive from
   * @param salt - Optional salt (will be generated if not provided)
   * @returns Promise with derived key and salt
   */
  static async deriveKey(password: string, salt?: Uint8Array): Promise<DerivedKeyResult> {
    // Generate salt if not provided
    if (!salt) {
      salt = crypto.getRandomValues(new Uint8Array(32));
    }

    // Convert password to key material
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    // Derive key using PBKDF2
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      this.KEY_LENGTH * 8 // bits
    );

    return {
      key: new Uint8Array(derivedBits),
      salt
    };
  }

  /**
   * Derive a key with custom parameters
   * @param password - The password
   * @param salt - The salt
   * @param iterations - Number of iterations (ignored, uses default)
   * @param memory - Memory cost in KB (ignored)
   * @param parallelism - Parallelism factor (ignored)
   * @returns Promise with derived key
   */
  static async deriveKeyCustom(
    password: string,
    salt: Uint8Array,
    iterations?: number,
    memory?: number,
    parallelism?: number
  ): Promise<Uint8Array> {
    const result = await this.deriveKey(password, salt);
    return result.key;
  }
}