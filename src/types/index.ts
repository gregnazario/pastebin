/**
 * Shared TypeScript types for encrypted pastes.
 */

export interface FileMetadata {
  name: string
  size: number
  mimeType: string
  uploadDate: number
  expirationDate?: number
  encryptionConfig: {
    encryptMetadata: boolean
    algorithm: string
  }
}

export interface UploadResult {
  id: string
  url: string
  expiresAt: number
}
