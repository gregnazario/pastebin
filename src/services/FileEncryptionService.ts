/**
 * File Encryption Service
 * Handles client-side encryption/decryption and coordinates with server for storage.
 * Uses a Web Worker for CPU-intensive crypto operations to keep the UI responsive.
 */

import { downloadBlob, uploadBlob } from '../server/shelby'
import type { FileMetadata } from '../types'
import { getCryptoWorkerService } from './CryptoWorkerService'
import { KeyDerivationService } from './crypto/KeyDerivation'
import { PasswordValidator } from './validation/PasswordValidator'

// Config
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const LINK_EXPIRY_HOURS = 24 * 30 // 30 days

export interface EncryptedUploadResult {
  fileId: string
  shareableUrl: string
  kyberPrivateKey: Uint8Array
  expiresAt: number
}

export interface UploadProgress {
  stage: 'validating' | 'encrypting' | 'uploading' | 'complete'
  progress: number
  message: string
}

export class FileEncryptionService {
  /**
   * Upload and encrypt a file
   * Encryption runs in a Web Worker to keep UI responsive
   */
  async uploadFile(
    file: File,
    password: string,
    encryptMetadata: boolean = false,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<EncryptedUploadResult> {
    try {
      // Stage 1: Validate inputs
      onProgress?.({
        stage: 'validating',
        progress: 5,
        message: 'Validating password...',
      })

      const passwordValidation = PasswordValidator.validate(password)
      if (!passwordValidation.isValid) {
        throw new Error(`Invalid password: ${passwordValidation.errors.join(', ')}`)
      }

      if (file.size > MAX_FILE_SIZE) {
        const maxSizeMB = MAX_FILE_SIZE / 1024 / 1024
        throw new Error(`File too large. Maximum size is ${maxSizeMB}MB`)
      }

      // Stage 2: Read file data
      onProgress?.({
        stage: 'encrypting',
        progress: 10,
        message: 'Reading file...',
      })

      const fileData = await this.readFileAsUint8Array(file)

      // Stage 3: Encrypt the file in Web Worker
      const metadata: FileMetadata = {
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        uploadDate: Date.now(),
        expirationDate: Date.now() + LINK_EXPIRY_HOURS * 60 * 60 * 1000,
        encryptionConfig: {
          encryptMetadata,
          algorithm: 'Kyber768+AES256-GCM',
        },
      }

      // Use Web Worker for CPU-intensive encryption
      const cryptoWorker = getCryptoWorkerService()
      const { serializedPayload, kyberPrivateKey } = await cryptoWorker.encrypt(
        fileData,
        password,
        metadata,
        encryptMetadata,
        // Forward worker progress to caller
        (_stage, percent, message) => {
          // Map worker progress (0-100) to encryption stage (15-55)
          const mappedProgress = 15 + Math.round(percent * 0.4)
          onProgress?.({
            stage: 'encrypting',
            progress: mappedProgress,
            message,
          })
        },
      )

      // Stage 4: Upload to Shelby via server function
      onProgress?.({
        stage: 'uploading',
        progress: 60,
        message: 'Uploading encrypted file...',
      })

      // Call server function
      // When encryptMetadata is true, use a generic placeholder filename to avoid
      // exposing the real filename in the URL. The actual filename is already
      // encrypted in the payload and will be revealed after decryption.
      const uploadResult = await uploadBlob({
        data: {
          data: Array.from(serializedPayload),
          filename: encryptMetadata ? 'encrypted' : file.name,
        },
      })

      // Stage 5: Generate shareable link
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Upload complete!',
      })

      const encodedKey = KeyDerivationService.keyToBase64Url(kyberPrivateKey)
      const shareableUrl = `${window.location.origin}/p/${uploadResult.id}#${encodedKey}`

      return {
        fileId: uploadResult.id,
        shareableUrl,
        kyberPrivateKey,
        expiresAt: uploadResult.expiresAt,
      }
    } catch (error) {
      throw new Error(
        `File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Download and decrypt a file
   * Decryption runs in a Web Worker to keep UI responsive
   */
  async downloadFile(
    fileId: string,
    password: string,
    privateKeyFragment?: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<{ data: Uint8Array; metadata: FileMetadata }> {
    try {
      // Stage 1: Download from Shelby via server function
      onProgress?.({
        stage: 'validating',
        progress: 10,
        message: 'Downloading encrypted file...',
      })

      const downloadResult = await downloadBlob({ data: { id: fileId } })
      const encryptedData = new Uint8Array(downloadResult.data)

      // Stage 2: Get private key
      onProgress?.({
        stage: 'encrypting',
        progress: 20,
        message: 'Preparing to decrypt...',
      })

      let kyberPrivateKey: Uint8Array
      if (privateKeyFragment) {
        kyberPrivateKey = KeyDerivationService.base64UrlToKey(privateKeyFragment)
      } else {
        throw new Error('Private key required for decryption')
      }

      // Stage 3: Decrypt the file in Web Worker
      const cryptoWorker = getCryptoWorkerService()
      const { data, metadata } = await cryptoWorker.decrypt(
        encryptedData,
        password,
        kyberPrivateKey,
        // Forward worker progress to caller
        (_stage, percent, message) => {
          // Map worker progress (0-100) to decryption stage (25-90)
          const mappedProgress = 25 + Math.round(percent * 0.65)
          onProgress?.({
            stage: 'encrypting',
            progress: mappedProgress,
            message,
          })
        },
      )

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Download complete!',
      })

      return { data, metadata }
    } catch (error) {
      throw new Error(
        `File download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Read a File as Uint8Array
   */
  private readFileAsUint8Array(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(new Uint8Array(reader.result))
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'))
        }
      }

      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * Create a downloadable file from decrypted data
   */
  static createDownloadableFile(data: Uint8Array, metadata: FileMetadata): Blob {
    const arrayBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer
    return new Blob([new Uint8Array(arrayBuffer)], { type: metadata.mimeType })
  }

  /**
   * Trigger a file download in the browser
   */
  static triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}
