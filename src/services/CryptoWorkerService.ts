/**
 * Crypto Worker Service
 * Wrapper for communicating with the crypto web worker from the main thread.
 * Provides a Promise-based API for encryption/decryption operations.
 */

import type { FileMetadata } from '../types'
import type { CryptoWorkerRequest, CryptoWorkerResponse } from '../workers/crypto.worker'

export interface CryptoProgressCallback {
  (stage: string, percent: number, message: string): void
}

export interface EncryptionResult {
  serializedPayload: Uint8Array
  kyberPrivateKey: Uint8Array
}

export interface DecryptionResult {
  data: Uint8Array
  metadata: FileMetadata
}

/**
 * Service for performing crypto operations in a web worker
 */
export class CryptoWorkerService {
  private worker: Worker | null = null
  private pendingRequests: Map<
    string,
    {
      resolve: (value: unknown) => void
      reject: (error: Error) => void
      onProgress?: CryptoProgressCallback
    }
  > = new Map()
  private requestCounter = 0

  /**
   * Initialize the worker (lazy initialization)
   */
  private async getWorker(): Promise<Worker> {
    if (this.worker) {
      return this.worker
    }

    // Dynamic import of the worker using Vite's worker syntax
    const WorkerConstructor = (await import('../workers/crypto.worker?worker')).default
    this.worker = new WorkerConstructor()

    this.worker.onmessage = (event: MessageEvent<CryptoWorkerResponse>) => {
      this.handleWorkerMessage(event.data)
    }

    this.worker.onerror = (error) => {
      console.error('Crypto worker error:', error)
      // Reject all pending requests
      for (const [id, { reject }] of this.pendingRequests) {
        reject(new Error('Worker crashed'))
        this.pendingRequests.delete(id)
      }
    }

    return this.worker
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(response: CryptoWorkerResponse): void {
    const pending = this.pendingRequests.get(response.id)
    if (!pending) {
      console.warn('Received response for unknown request:', response.id)
      return
    }

    switch (response.type) {
      case 'PROGRESS':
        pending.onProgress?.(response.stage, response.percent, response.message)
        break

      case 'ENCRYPT_RESULT':
        pending.resolve({
          serializedPayload: response.serializedPayload,
          kyberPrivateKey: response.kyberPrivateKey,
        } as EncryptionResult)
        this.pendingRequests.delete(response.id)
        break

      case 'DECRYPT_RESULT':
        pending.resolve({
          data: response.data,
          metadata: response.metadata,
        } as DecryptionResult)
        this.pendingRequests.delete(response.id)
        break

      case 'ERROR':
        pending.reject(new Error(response.error))
        this.pendingRequests.delete(response.id)
        break
    }
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${++this.requestCounter}_${Date.now()}`
  }

  /**
   * Encrypt data using the web worker
   * @param data - The data to encrypt
   * @param password - The password for encryption
   * @param metadata - File metadata
   * @param encryptMetadata - Whether to encrypt metadata
   * @param onProgress - Progress callback
   * @returns Promise with encrypted payload and private key
   */
  async encrypt(
    data: Uint8Array,
    password: string,
    metadata: FileMetadata,
    encryptMetadata: boolean = false,
    onProgress?: CryptoProgressCallback,
  ): Promise<EncryptionResult> {
    const worker = await this.getWorker()
    const id = this.generateRequestId()

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        onProgress,
      })

      const request: CryptoWorkerRequest = {
        type: 'ENCRYPT',
        id,
        data,
        password,
        metadata,
        encryptMetadata,
      }

      worker.postMessage(request)
    })
  }

  /**
   * Decrypt data using the web worker
   * @param encryptedData - The encrypted data
   * @param password - The password for decryption
   * @param kyberPrivateKey - The Kyber private key
   * @param onProgress - Progress callback
   * @returns Promise with decrypted data and metadata
   */
  async decrypt(
    encryptedData: Uint8Array,
    password: string,
    kyberPrivateKey: Uint8Array,
    onProgress?: CryptoProgressCallback,
  ): Promise<DecryptionResult> {
    const worker = await this.getWorker()
    const id = this.generateRequestId()

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        onProgress,
      })

      const request: CryptoWorkerRequest = {
        type: 'DECRYPT',
        id,
        encryptedData,
        password,
        kyberPrivateKey,
      }

      worker.postMessage(request)
    })
  }

  /**
   * Terminate the worker and clean up resources
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    // Reject all pending requests
    for (const [, { reject }] of this.pendingRequests) {
      reject(new Error('Worker terminated'))
    }
    this.pendingRequests.clear()
  }
}

// Singleton instance for convenience
let workerServiceInstance: CryptoWorkerService | null = null

/**
 * Get the singleton crypto worker service instance
 */
export function getCryptoWorkerService(): CryptoWorkerService {
  if (!workerServiceInstance) {
    workerServiceInstance = new CryptoWorkerService()
  }
  return workerServiceInstance
}
