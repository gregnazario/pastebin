/**
 * Secure Memory Utilities
 * Provides functions for clearing sensitive data from memory.
 *
 * IMPORTANT: JavaScript's memory model limits our ability to guarantee memory clearing.
 * The garbage collector may have already copied data, and we can't control when memory
 * is actually reclaimed. However, these utilities minimize the exposure window and
 * make recovery more difficult.
 */

/**
 * Securely clear a Uint8Array by overwriting with random data
 * This makes it harder to recover the original data from memory
 * @param array - The array to clear
 */
export function secureClear(array: Uint8Array): void {
  if (!array || array.length === 0) return

  // Overwrite with random data to make recovery harder
  crypto.getRandomValues(array)

  // Then overwrite with zeros for good measure
  array.fill(0)
}

/**
 * Securely clear multiple Uint8Arrays
 * @param arrays - Arrays to clear
 */
export function secureClearAll(...arrays: (Uint8Array | undefined | null)[]): void {
  for (const array of arrays) {
    if (array) {
      secureClear(array)
    }
  }
}

/**
 * Execute a function with sensitive data and clear it afterward
 * Ensures cleanup happens even if an error is thrown
 * @param sensitiveData - Array of Uint8Arrays that should be cleared after use
 * @param fn - Function to execute
 * @returns Result of the function
 */
export async function withSecureCleanup<T>(
  sensitiveData: Uint8Array[],
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn()
  } finally {
    secureClearAll(...sensitiveData)
  }
}

/**
 * Create a Uint8Array that will be cleared when the cleanup function is called
 * Useful for managing sensitive data lifecycle
 * @param size - Size of the array
 * @returns Object with the array and a cleanup function
 */
export function createSecureBuffer(size: number): {
  buffer: Uint8Array
  clear: () => void
} {
  const buffer = new Uint8Array(size)
  return {
    buffer,
    clear: () => secureClear(buffer),
  }
}

/**
 * Copy data into a secure buffer that can be cleared later
 * @param source - Source data to copy
 * @returns Object with the copied buffer and a cleanup function
 */
export function copyToSecureBuffer(source: Uint8Array): {
  buffer: Uint8Array
  clear: () => void
} {
  const buffer = new Uint8Array(source.length)
  buffer.set(source)
  return {
    buffer,
    clear: () => secureClear(buffer),
  }
}
