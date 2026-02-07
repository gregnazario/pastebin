import { argon2id } from 'hash-wasm'

export interface DerivedKeyResult {
  key: Uint8Array
  salt: Uint8Array
  parameters: {
    iterations: number
    memory: number
    parallelism: number
    hashLength: number
  }
}

export class KeyDerivationService {
  // Default parameters for Argon2id
  // These parameters provide strong security while remaining usable on client devices
  // - iterations: 4 provides good resistance to GPU attacks
  // - memory: 256MB significantly increases attack cost
  // - parallelism: 4 utilizes multi-core CPUs for better performance
  static readonly DEFAULT_ITERATIONS = 4
  static readonly DEFAULT_MEMORY = 256 * 1024 // 256MB in KB - increased for better security
  static readonly DEFAULT_PARALLELISM = 4 // Utilize multi-core CPUs
  private static readonly DEFAULT_HASH_LENGTH = 32 // 256 bits
  private static readonly SALT_LENGTH = 32 // 256 bits

  /**
   * Derive a key from a password using Argon2id
   * @param password - The password to derive from
   * @param salt - Optional salt (will generate if not provided)
   * @returns Promise with derived key and parameters
   */
  static async deriveKey(password: string, salt?: Uint8Array): Promise<DerivedKeyResult> {
    // Generate salt if not provided
    if (!salt) {
      salt = crypto.getRandomValues(new Uint8Array(KeyDerivationService.SALT_LENGTH))
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
      })

      // Convert hex to Uint8Array
      const key = KeyDerivationService.hexToBytes(hashHex)

      return {
        key,
        salt,
        parameters: {
          iterations: KeyDerivationService.DEFAULT_ITERATIONS,
          memory: KeyDerivationService.DEFAULT_MEMORY,
          parallelism: KeyDerivationService.DEFAULT_PARALLELISM,
          hashLength: KeyDerivationService.DEFAULT_HASH_LENGTH,
        },
      }
    } catch (error) {
      throw new Error(
        `Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Derive a key with custom parameters.
   * Validates all parameters are within safe bounds to prevent misuse.
   * @param password - The password to derive from
   * @param salt - The salt to use (must be at least 16 bytes)
   * @param iterations - Number of iterations (1-100)
   * @param memory - Memory usage in KB (16KB - 4GB)
   * @param parallelism - Degree of parallelism (1-16)
   * @returns Promise with derived key
   */
  static async deriveKeyCustom(
    password: string,
    salt: Uint8Array,
    iterations: number,
    memory: number,
    parallelism: number,
  ): Promise<Uint8Array> {
    // Validate parameters to prevent misuse or DoS
    if (salt.length < 16) {
      throw new Error('Key derivation failed: salt must be at least 16 bytes')
    }
    if (!Number.isInteger(iterations) || iterations < 1 || iterations > 100) {
      throw new Error('Key derivation failed: iterations must be between 1 and 100')
    }
    if (!Number.isInteger(memory) || memory < 16 || memory > 4 * 1024 * 1024) {
      throw new Error('Key derivation failed: memory must be between 16 KB and 4 GB')
    }
    if (!Number.isInteger(parallelism) || parallelism < 1 || parallelism > 16) {
      throw new Error('Key derivation failed: parallelism must be between 1 and 16')
    }

    try {
      const hashHex = await argon2id({
        password,
        salt,
        iterations,
        memorySize: memory,
        parallelism,
        hashLength: KeyDerivationService.DEFAULT_HASH_LENGTH,
        outputType: 'hex',
      })

      return KeyDerivationService.hexToBytes(hashHex)
    } catch (error) {
      throw new Error(
        `Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Convert hex string to Uint8Array
   */
  private static hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
    }
    return bytes
  }

  /**
   * Generate a random salt
   * @returns Random salt as Uint8Array
   */
  static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(KeyDerivationService.SALT_LENGTH))
  }

  /**
   * Convert derived key to base64url format (for URL fragments)
   * @param key - The key to encode
   * @returns Base64url encoded string
   */
  static keyToBase64Url(key: Uint8Array): string {
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(key)))
    // Convert to base64url by replacing characters
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  /**
   * Convert base64url back to Uint8Array
   * @param base64url - Base64url encoded string
   * @returns Decoded key as Uint8Array
   */
  static base64UrlToKey(base64url: string): Uint8Array {
    // Convert from base64url to base64
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')

    // Add padding if necessary
    const padding = base64.length % 4
    if (padding) {
      base64 += '='.repeat(4 - padding)
    }

    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
}
