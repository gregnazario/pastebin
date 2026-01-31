import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShelbyError } from '../../../types';
import { ShelbyService } from '../ShelbyService';

describe('ShelbyService', () => {
  let service: ShelbyService;

  beforeEach(() => {
    service = new ShelbyService({
      apiUrl: 'https://api.test.shelby.xyz',
      apiKey: 'test-api-key',
    });
    vi.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should successfully upload a file', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'test-file-id' }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as unknown as typeof fetch;

      const testData = new Uint8Array([1, 2, 3, 4]);
      const result = await service.uploadFile(testData);

      expect(result.id).toBe('test-file-id');
      expect(result.url).toContain('test-file-id');
      expect(result.expiresAt).toBeGreaterThan(Date.now());

      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.shelby.xyz/blobs',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/octet-stream',
            Authorization: 'Bearer test-api-key',
          }),
          body: testData,
        }),
      );
    });

    it('should handle upload errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as unknown as typeof fetch;

      const testData = new Uint8Array([1, 2, 3, 4]);

      await expect(service.uploadFile(testData)).rejects.toThrow(ShelbyError);
    });

    it('should retry on network errors', async () => {
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({ id: 'test-file-id' }),
        });
      }) as unknown as typeof fetch;

      const testData = new Uint8Array([1, 2, 3, 4]);
      const result = await service.uploadFile(testData);

      expect(result.id).toBe('test-file-id');
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should include metadata in headers when provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'test-file-id' }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as unknown as typeof fetch;

      const testData = new Uint8Array([1, 2, 3, 4]);
      const metadata = { filename: 'test.txt', size: 4 };

      await service.uploadFile(testData, metadata);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Metadata': JSON.stringify(metadata),
          }),
        }),
      );
    });
  });

  describe('downloadFile', () => {
    it('should successfully download a file', async () => {
      const testData = new Uint8Array([1, 2, 3, 4]);
      const mockResponse = {
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(testData.buffer),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as unknown as typeof fetch;

      const result = await service.downloadFile('test-file-id');

      expect(result).toEqual(testData);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.shelby.xyz/blobs/test-file-id',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        }),
      );
    });

    it('should throw NOT_FOUND error for 404 responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as unknown as typeof fetch;

      await expect(service.downloadFile('non-existent-id')).rejects.toThrow(
        expect.objectContaining({
          code: 'NOT_FOUND',
          statusCode: 404,
        }),
      );
    });

    it('should not retry 404 errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as unknown as typeof fetch;

      await expect(service.downloadFile('non-existent-id')).rejects.toThrow();
      expect(fetch).toHaveBeenCalledTimes(1); // Should not retry
    });
  });

  describe('deleteFile', () => {
    it('should successfully delete a file', async () => {
      const mockResponse = { ok: true };
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as unknown as typeof fetch;

      await service.deleteFile('test-file-id');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.shelby.xyz/blobs/test-file-id',
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });

    it('should not throw error for 404 on delete', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as unknown as typeof fetch;

      await expect(service.deleteFile('non-existent-id')).resolves.toBeUndefined();
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const mockResponse = { ok: true };
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as unknown as typeof fetch;

      const exists = await service.fileExists('test-file-id');

      expect(exists).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.shelby.xyz/blobs/test-file-id',
        expect.objectContaining({
          method: 'HEAD',
        }),
      );
    });

    it('should return false for non-existing file', async () => {
      const mockResponse = { ok: false };
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as unknown as typeof fetch;

      const exists = await service.fileExists('non-existent-id');

      expect(exists).toBe(false);
    });

    it('should return false on network error', async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;

      const exists = await service.fileExists('test-file-id');

      expect(exists).toBe(false);
    });
  });
});
