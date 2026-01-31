import { config } from '../../config';
import { type ShelbyConfig, ShelbyError, type UploadResult } from '../../types';
import { withRetry } from '../../utils/retry';

export class ShelbyService {
  private config: ShelbyConfig;
  private baseUrl: string;

  constructor(customConfig?: Partial<ShelbyConfig>) {
    this.config = {
      apiUrl: customConfig?.apiUrl || config.shelby.apiUrl,
      network: customConfig?.network || (config.shelby.network as 'shelbynet' | 'testnet'),
      apiKey: customConfig?.apiKey || config.shelby.apiKey,
    };
    this.baseUrl = this.config.apiUrl;
  }

  /**
   * Upload a file to Shelby storage
   * @param data - The file data as Uint8Array
   * @param metadata - Optional metadata for the file
   * @returns Promise with upload result containing ID and URL
   */
  async uploadFile(data: Uint8Array, metadata?: Record<string, any>): Promise<UploadResult> {
    return withRetry(async () => {
      try {
        // For now, we'll use a PUT request to upload the blob
        // The actual implementation will depend on Shelby's API
        // Create a proper ArrayBuffer-backed Uint8Array for Blob compatibility
        const arrayBuffer = data.buffer.slice(
          data.byteOffset,
          data.byteOffset + data.byteLength,
        ) as ArrayBuffer;
        const response = await fetch(`${this.baseUrl}/blobs`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/octet-stream',
            ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
            ...(metadata && { 'X-Metadata': JSON.stringify(metadata) }),
          },
          body: new Blob([new Uint8Array(arrayBuffer)]),
        });

        if (!response.ok) {
          throw new ShelbyError(
            `Upload failed: ${response.statusText}`,
            'UPLOAD_ERROR',
            response.status,
          );
        }

        const result = await response.json();

        return {
          id: result.id || result.blobId,
          url: `${this.baseUrl}/blobs/${result.id || result.blobId}`,
          expiresAt: Date.now() + config.app.linkExpiryHours * 60 * 60 * 1000,
        };
      } catch (error) {
        if (error instanceof ShelbyError) {
          throw error;
        }
        throw new ShelbyError(
          `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'NETWORK_ERROR',
        );
      }
    });
  }

  /**
   * Download a file from Shelby storage
   * @param id - The file ID
   * @returns Promise with file data as Uint8Array
   */
  async downloadFile(id: string): Promise<Uint8Array> {
    return withRetry(
      async () => {
        try {
          const response = await fetch(`${this.baseUrl}/blobs/${id}`, {
            method: 'GET',
            headers: {
              ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              throw new ShelbyError('File not found', 'NOT_FOUND', 404);
            }
            throw new ShelbyError(
              `Download failed: ${response.statusText}`,
              'DOWNLOAD_ERROR',
              response.status,
            );
          }

          const buffer = await response.arrayBuffer();
          return new Uint8Array(buffer);
        } catch (error) {
          if (error instanceof ShelbyError) {
            throw error;
          }
          throw new ShelbyError(
            `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'NETWORK_ERROR',
          );
        }
      },
      {
        // Don't retry 404s
        shouldRetry: (error) => error.code !== 'NOT_FOUND' && error.statusCode !== 404,
      },
    );
  }

  /**
   * Delete a file from Shelby storage
   * @param id - The file ID
   */
  async deleteFile(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/blobs/${id}`, {
        method: 'DELETE',
        headers: {
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
      });

      if (!response.ok && response.status !== 404) {
        throw new ShelbyError(
          `Delete failed: ${response.statusText}`,
          'DELETE_ERROR',
          response.status,
        );
      }
    } catch (error) {
      if (error instanceof ShelbyError) {
        throw error;
      }
      throw new ShelbyError(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK_ERROR',
      );
    }
  }

  /**
   * Check if a file exists
   * @param id - The file ID
   * @returns Promise<boolean>
   */
  async fileExists(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/blobs/${id}`, {
        method: 'HEAD',
        headers: {
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
