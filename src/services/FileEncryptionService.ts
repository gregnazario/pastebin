import { HybridEncryptionService, EncryptedPayload } from './crypto/HybridEncryption';
import { KeyDerivationService } from './crypto/KeyDerivation';
import { ShelbyService } from './storage/ShelbyService';
import { PasswordValidator } from './validation/PasswordValidator';
import { FileMetadata, UploadResult } from '../types';
import { config } from '../config';

export interface EncryptedUploadResult {
  fileId: string;
  shareableUrl: string;
  kyberPrivateKey: Uint8Array;
  expiresAt: number;
}

export interface UploadProgress {
  stage: 'validating' | 'encrypting' | 'uploading' | 'complete';
  progress: number;
  message: string;
}

export class FileEncryptionService {
  private shelbyService: ShelbyService;

  constructor() {
    this.shelbyService = new ShelbyService();
  }

  /**
   * Upload and encrypt a file
   * @param file - The file to upload
   * @param password - The password for encryption
   * @param encryptMetadata - Whether to encrypt metadata
   * @param onProgress - Progress callback
   * @returns Promise with upload result
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
        progress: 10,
        message: 'Validating password...',
      });

      // Validate password
      const passwordValidation = PasswordValidator.validate(password);
      if (!passwordValidation.isValid) {
        throw new Error(`Invalid password: ${passwordValidation.errors.join(', ')}`);
      }

      // Check file size
      if (file.size > config.app.maxFileSize) {
        const maxSizeMB = config.app.maxFileSize / 1024 / 1024;
        throw new Error(`File too large. Maximum size is ${maxSizeMB}MB`);
      }

      // Stage 2: Read file data
      onProgress?.({
        stage: 'encrypting',
        progress: 20,
        message: 'Reading file...',
      });

      const fileData = await this.readFileAsUint8Array(file);

      // Stage 3: Encrypt the file
      onProgress?.({
        stage: 'encrypting',
        progress: 40,
        message: 'Encrypting file...',
      });

      const metadata: FileMetadata = {
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        uploadDate: Date.now(),
        expirationDate: Date.now() + config.app.linkExpiryHours * 60 * 60 * 1000,
        encryptionConfig: {
          encryptMetadata,
          algorithm: 'Kyber768+AES256-GCM',
        },
      };

      const { payload, keys } = await HybridEncryptionService.encrypt(
        fileData,
        password,
        metadata,
        encryptMetadata,
      );

      // Stage 4: Upload to Shelby
      onProgress?.({
        stage: 'uploading',
        progress: 60,
        message: 'Uploading encrypted file...',
      });

      // Serialize the encrypted payload
      const serializedPayload = HybridEncryptionService.serializePayload(payload);

      // Upload to Shelby
      const uploadResult = await this.shelbyService.uploadFile(serializedPayload, {
        encrypted: true,
        metadataEncrypted: encryptMetadata,
      });

      // Stage 5: Generate shareable link
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Upload complete!',
      });

      // Encode the private key for URL fragment
      const encodedKey = KeyDerivationService.keyToBase64Url(keys.kyberPrivateKey);
      const shareableUrl = `${window.location.origin}/p/${uploadResult.id}#${encodedKey}`;

      return {
        fileId: uploadResult.id,
        shareableUrl,
        kyberPrivateKey: keys.kyberPrivateKey,
        expiresAt: uploadResult.expiresAt,
      };
    } catch (error) {
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download and decrypt a file
   * @param fileId - The file ID from Shelby
   * @param password - The password for decryption
   * @param privateKeyFragment - The private key from URL fragment (optional)
   * @param onProgress - Progress callback
   * @returns Promise with decrypted file data and metadata
   */
  async downloadFile(
    fileId: string,
    password: string,
    privateKeyFragment?: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<{ data: Uint8Array; metadata: FileMetadata }> {
    try {
      // Stage 1: Download from Shelby
      onProgress?.({
        stage: 'validating',
        progress: 20,
        message: 'Downloading encrypted file...',
      });

      const encryptedData = await this.shelbyService.downloadFile(fileId);

      // Stage 2: Deserialize payload
      onProgress?.({
        stage: 'encrypting',
        progress: 40,
        message: 'Preparing to decrypt...',
      });

      const payload = HybridEncryptionService.deserializePayload(encryptedData);

      // Stage 3: Get private key
      let kyberPrivateKey: Uint8Array;
      if (privateKeyFragment) {
        // Decode from URL fragment
        kyberPrivateKey = KeyDerivationService.base64UrlToKey(privateKeyFragment);
      } else {
        throw new Error('Private key required for decryption');
      }

      // Stage 4: Decrypt the file
      onProgress?.({
        stage: 'encrypting',
        progress: 60,
        message: 'Decrypting file...',
      });

      const { data, metadata } = await HybridEncryptionService.decrypt(
        payload,
        password,
        kyberPrivateKey,
      );

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Download complete!',
      });

      return { data, metadata };
    } catch (error) {
      throw new Error(`File download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Read a File as Uint8Array
   * @param file - The file to read
   * @returns Promise with file data as Uint8Array
   */
  private readFileAsUint8Array(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(new Uint8Array(reader.result));
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Create a downloadable file from decrypted data
   * @param data - The decrypted file data
   * @param metadata - The file metadata
   * @returns Blob that can be downloaded
   */
  static createDownloadableFile(data: Uint8Array, metadata: FileMetadata): Blob {
    return new Blob([data], { type: metadata.mimeType });
  }

  /**
   * Trigger a file download in the browser
   * @param blob - The file blob
   * @param filename - The filename to save as
   */
  static triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}