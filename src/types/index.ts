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

export interface ShelbyConfig {
  apiUrl: string
  apiKey?: string
  network?: 'shelbynet' | 'testnet'
}

export class ShelbyError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
  ) {
    super(message)
    this.name = 'ShelbyError'
  }
}
