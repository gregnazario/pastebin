/**
 * Crypto Web Worker
 * Handles CPU-intensive encryption/decryption operations off the main thread
 * to keep the UI responsive during cryptographic operations.
 */

import { HybridEncryptionService, type EncryptedPayload } from '../services/crypto/HybridEncryption'
import type { FileMetadata } from '../types'

// Message types for worker communication
export type CryptoWorkerRequest =
  | {
      type: 'ENCRYPT'
      id: string
      data: Uint8Array
      password: string
      metadata: FileMetadata
      encryptMetadata: boolean
    }
  | {
      type: 'DECRYPT'
      id: string
      encryptedData: Uint8Array
      password: string
      kyberPrivateKey: Uint8Array
    }

export type CryptoWorkerResponse =
  | {
      type: 'ENCRYPT_RESULT'
      id: string
      serializedPayload: Uint8Array
      kyberPrivateKey: Uint8Array
    }
  | {
      type: 'DECRYPT_RESULT'
      id: string
      data: Uint8Array
      metadata: FileMetadata
    }
  | {
      type: 'PROGRESS'
      id: string
      stage: string
      percent: number
      message: string
    }
  | {
      type: 'ERROR'
      id: string
      error: string
    }

// Worker context
const ctx = self as unknown as Worker

/**
 * Sanitize error messages to prevent information leakage in production
 * Development shows full errors for debugging; production uses generic messages
 */
function sanitizeError(error: unknown, operation: 'encrypt' | 'decrypt'): string {
  const message = error instanceof Error ? error.message : 'Unknown error'

  // In production, use generic error messages to prevent info leakage
  // Check if we're in production (works in both Node.js and browser contexts)
  let isProduction = false
  try {
    isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'
  } catch {
    // process not available in worker context, assume production for safety
    isProduction = true
  }

  if (isProduction) {
    // Check for common error types and return safe messages
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('password') || lowerMessage.includes('key')) {
      return operation === 'decrypt'
        ? 'Decryption failed: invalid password or corrupted data'
        : 'Encryption failed: key derivation error'
    }

    if (
      lowerMessage.includes('payload') ||
      lowerMessage.includes('buffer') ||
      lowerMessage.includes('invalid')
    ) {
      return operation === 'decrypt'
        ? 'Decryption failed: corrupted or invalid data'
        : 'Encryption failed: data processing error'
    }

    if (lowerMessage.includes('kyber') || lowerMessage.includes('ciphertext')) {
      return operation === 'decrypt'
        ? 'Decryption failed: invalid encryption key'
        : 'Encryption failed: cryptographic error'
    }

    // Generic fallback
    return operation === 'decrypt'
      ? 'Decryption failed: please check your password and try again'
      : 'Encryption failed: please try again'
  }

  // Development: return full error for debugging
  return message
}

/**
 * Send progress update to main thread
 */
function sendProgress(id: string, stage: string, percent: number, message: string): void {
  ctx.postMessage({
    type: 'PROGRESS',
    id,
    stage,
    percent,
    message,
  } satisfies CryptoWorkerResponse)
}

/**
 * Handle encryption request
 */
async function handleEncrypt(
  request: Extract<CryptoWorkerRequest, { type: 'ENCRYPT' }>,
): Promise<void> {
  const { id, data, password, metadata, encryptMetadata } = request

  try {
    sendProgress(id, 'encrypting', 10, 'Starting encryption...')

    // Step 1: Derive key from password (CPU intensive - Argon2id with 256MB)
    sendProgress(id, 'encrypting', 20, 'Deriving encryption key...')

    // Step 2: Perform hybrid encryption
    sendProgress(id, 'encrypting', 40, 'Encrypting with post-quantum crypto...')

    const { payload, keys } = await HybridEncryptionService.encrypt(
      data,
      password,
      metadata,
      encryptMetadata,
    )

    // Step 3: Serialize the payload
    sendProgress(id, 'encrypting', 80, 'Serializing encrypted data...')

    const serializedPayload = HybridEncryptionService.serializePayload(payload)

    sendProgress(id, 'encrypting', 100, 'Encryption complete!')

    ctx.postMessage({
      type: 'ENCRYPT_RESULT',
      id,
      serializedPayload,
      kyberPrivateKey: keys.kyberPrivateKey,
    } satisfies CryptoWorkerResponse)
  } catch (error) {
    ctx.postMessage({
      type: 'ERROR',
      id,
      error: sanitizeError(error, 'encrypt'),
    } satisfies CryptoWorkerResponse)
  }
}

/**
 * Handle decryption request
 */
async function handleDecrypt(
  request: Extract<CryptoWorkerRequest, { type: 'DECRYPT' }>,
): Promise<void> {
  const { id, encryptedData, password, kyberPrivateKey } = request

  try {
    sendProgress(id, 'decrypting', 10, 'Starting decryption...')

    // Step 1: Deserialize the payload
    sendProgress(id, 'decrypting', 20, 'Parsing encrypted data...')

    const payload = HybridEncryptionService.deserializePayload(encryptedData)

    // Step 2: Perform hybrid decryption (CPU intensive - Argon2id + Kyber)
    sendProgress(id, 'decrypting', 40, 'Decrypting with post-quantum crypto...')

    const { data, metadata } = await HybridEncryptionService.decrypt(
      payload,
      password,
      kyberPrivateKey,
    )

    sendProgress(id, 'decrypting', 100, 'Decryption complete!')

    ctx.postMessage({
      type: 'DECRYPT_RESULT',
      id,
      data,
      metadata,
    } satisfies CryptoWorkerResponse)
  } catch (error) {
    ctx.postMessage({
      type: 'ERROR',
      id,
      error: sanitizeError(error, 'decrypt'),
    } satisfies CryptoWorkerResponse)
  }
}

/**
 * Main message handler
 */
ctx.onmessage = async (event: MessageEvent<CryptoWorkerRequest>) => {
  const request = event.data

  switch (request.type) {
    case 'ENCRYPT':
      await handleEncrypt(request)
      break
    case 'DECRYPT':
      await handleDecrypt(request)
      break
    default:
      ctx.postMessage({
        type: 'ERROR',
        id: 'unknown',
        error: `Unknown request type: ${(request as CryptoWorkerRequest).type}`,
      } satisfies CryptoWorkerResponse)
  }
}

// Export types for use in main thread
export type { EncryptedPayload }
