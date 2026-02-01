import { ml_kem768 } from '@noble/post-quantum/ml-kem.js'

export interface KyberKeyPair {
  publicKey: Uint8Array
  privateKey: Uint8Array
}

export interface KyberEncapsulationResult {
  sharedSecret: Uint8Array
  ciphertext: Uint8Array
}

export class KyberService {
  // Use ML-KEM-768 (Kyber768) for 192-bit security
  // This provides post-quantum security roughly equivalent to AES-192
  private static readonly kyber = ml_kem768

  /**
   * Generate a new Kyber key pair
   * @returns Promise with public and private keys
   */
  static async generateKeyPair(): Promise<KyberKeyPair> {
    try {
      // Generate random seed
      const seed = crypto.getRandomValues(new Uint8Array(64))

      // Generate key pair
      const { publicKey, secretKey } = KyberService.kyber.keygen(seed)

      return {
        publicKey,
        privateKey: secretKey,
      }
    } catch (error) {
      throw new Error(
        `Kyber key generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Encapsulate a shared secret using a public key
   * @param publicKey - The recipient's public key
   * @returns Promise with shared secret and ciphertext
   * @throws Error if public key is invalid
   */
  static async encapsulate(publicKey: Uint8Array): Promise<KyberEncapsulationResult> {
    // Validate public key size before use
    if (!KyberService.validatePublicKey(publicKey)) {
      const sizes = KyberService.getSizes()
      throw new Error(
        `Invalid public key: expected ${sizes.publicKeySize} bytes, got ${publicKey.length}`,
      )
    }

    try {
      // Generate random seed for encapsulation
      const seed = crypto.getRandomValues(new Uint8Array(32))

      // Encapsulate
      const { sharedSecret, cipherText } = KyberService.kyber.encapsulate(publicKey, seed)

      return {
        sharedSecret,
        ciphertext: cipherText,
      }
    } catch (error) {
      throw new Error(
        `Kyber encapsulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Decapsulate a shared secret using a private key
   * @param ciphertext - The encapsulated ciphertext
   * @param privateKey - The recipient's private key
   * @returns Promise with shared secret
   * @throws Error if ciphertext or private key is invalid
   */
  static async decapsulate(ciphertext: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    const sizes = KyberService.getSizes()

    // Validate ciphertext size
    if (!KyberService.validateCiphertext(ciphertext)) {
      throw new Error(
        `Invalid ciphertext: expected ${sizes.ciphertextSize} bytes, got ${ciphertext.length}`,
      )
    }

    // Validate private key size
    if (!KyberService.validatePrivateKey(privateKey)) {
      throw new Error(
        `Invalid private key: expected ${sizes.privateKeySize} bytes, got ${privateKey.length}`,
      )
    }

    try {
      const sharedSecret = KyberService.kyber.decapsulate(ciphertext, privateKey)
      return sharedSecret
    } catch (error) {
      throw new Error(
        `Kyber decapsulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Get the size parameters for Kyber768
   * @returns Object with size information
   */
  static getSizes() {
    return {
      publicKeySize: 1184, // bytes
      privateKeySize: 2400, // bytes
      ciphertextSize: 1088, // bytes
      sharedSecretSize: 32, // bytes
    }
  }

  /**
   * Validate a public key
   * @param publicKey - The public key to validate
   * @returns boolean indicating if the key is valid
   */
  static validatePublicKey(publicKey: Uint8Array): boolean {
    return publicKey.length === KyberService.getSizes().publicKeySize
  }

  /**
   * Validate a private key
   * @param privateKey - The private key to validate
   * @returns boolean indicating if the key is valid
   */
  static validatePrivateKey(privateKey: Uint8Array): boolean {
    return privateKey.length === KyberService.getSizes().privateKeySize
  }

  /**
   * Validate ciphertext
   * @param ciphertext - The ciphertext to validate
   * @returns boolean indicating if the ciphertext is valid
   */
  static validateCiphertext(ciphertext: Uint8Array): boolean {
    return ciphertext.length === KyberService.getSizes().ciphertextSize
  }
}
