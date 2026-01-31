/**
 * Secure utility functions for handling sensitive data
 */

/**
 * Securely clear a Uint8Array by overwriting with zeros
 * @param buffer - The buffer to clear
 */
export function secureClear(buffer: Uint8Array): void {
  if (buffer && buffer.length > 0) {
    // Overwrite with zeros
    buffer.fill(0);

    // Additional overwrite with random data for extra security
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(buffer);
    }

    // Final overwrite with zeros
    buffer.fill(0);
  }
}

/**
 * Securely clear a string from memory (best effort)
 * Note: JavaScript strings are immutable, so this is not guaranteed
 * @param str - The string to clear
 * @returns Empty string
 */
export function secureClearString(str: string): string {
  // Best effort - create a new string and hope GC clears the old one
  if (str && str.length > 0) {
    // Try to trigger garbage collection by creating pressure
    void new Array(str.length).fill('0').join('');
    return '';
  }
  return '';
}

/**
 * Create a secure wrapper for sensitive data that auto-clears
 */
export class SecureBuffer {
  private data: Uint8Array | null;

  constructor(data: Uint8Array) {
    this.data = new Uint8Array(data);
  }

  /**
   * Get the data (returns null if already cleared)
   */
  get(): Uint8Array | null {
    return this.data;
  }

  /**
   * Clear the data
   */
  clear(): void {
    if (this.data) {
      secureClear(this.data);
      this.data = null;
    }
  }

  /**
   * Use the data in a callback, then auto-clear
   * @param callback - Function to use the data
   * @returns Result of the callback
   */
  use<T>(callback: (data: Uint8Array) => T): T {
    if (!this.data) {
      throw new Error('SecureBuffer already cleared');
    }

    try {
      return callback(this.data);
    } finally {
      this.clear();
    }
  }
}

/**
 * Compare two buffers in constant time to prevent timing attacks
 * @param a - First buffer
 * @param b - Second buffer
 * @returns true if equal, false otherwise
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

/**
 * Create a timeout promise for operations that shouldn't hang
 * @param ms - Milliseconds to wait
 * @returns Promise that rejects after timeout
 */
export function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
}

/**
 * Run an operation with a timeout
 * @param promise - The promise to run
 * @param ms - Timeout in milliseconds
 * @returns Promise that rejects if timeout is reached
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, timeout(ms)]);
}

/**
 * Generate cryptographically secure random bytes
 * @param length - Number of bytes to generate
 * @returns Random bytes
 */
export function getRandomBytes(length: number): Uint8Array {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return buffer;
}

/**
 * Convert ArrayBuffer to hex string
 * @param buffer - The buffer to convert
 * @returns Hex string
 */
export function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to ArrayBuffer
 * @param hex - The hex string
 * @returns Uint8Array
 */
export function hexToBuffer(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}
