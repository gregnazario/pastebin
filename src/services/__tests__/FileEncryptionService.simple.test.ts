import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileEncryptionService } from '../FileEncryptionService';
import { createTestFile, TEST_PASSWORD } from '../../test/crypto-test-utils';

// Mock all crypto services
vi.mock('../crypto/HybridEncryption', () => ({
  HybridEncryptionService: {
    encrypt: vi.fn().mockImplementation(async (data, password, metadata, encryptMetadata) => ({
      payload: {
        kyberCiphertext: new Uint8Array([1, 2, 3]),
        aesCiphertext: new Uint8Array([4, 5, 6]),
        salt: new Uint8Array([7, 8, 9]),
        metadata: new TextEncoder().encode(JSON.stringify(metadata)),
        metadataEncrypted: encryptMetadata,
        version: 1,
      },
      keys: {
        kyberPublicKey: new Uint8Array([10, 11, 12]),
        kyberPrivateKey: new Uint8Array([13, 14, 15]),
      },
    })),
    decrypt: vi.fn().mockImplementation(async (payload, password, privateKey) => ({
      data: new TextEncoder().encode('Decrypted content'),
      metadata: {
        name: 'test.txt',
        size: 17,
        mimeType: 'text/plain',
        uploadDate: Date.now(),
        encryptionConfig: {
          encryptMetadata: false,
          algorithm: 'test',
        },
      },
    })),
    serializePayload: vi.fn().mockImplementation((payload) => new Uint8Array([1, 2, 3, 4, 5])),
    deserializePayload: vi.fn().mockImplementation(() => ({
      kyberCiphertext: new Uint8Array([1, 2, 3]),
      aesCiphertext: new Uint8Array([4, 5, 6]),
      salt: new Uint8Array([7, 8, 9]),
      metadata: new TextEncoder().encode('{}'),
      metadataEncrypted: false,
      version: 1,
    })),
  },
}));

vi.mock('../shelby/ShelbyService', () => ({
  ShelbyService: {
    uploadFile: vi.fn().mockResolvedValue('test-file-id'),
    downloadFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5])),
  },
}));

vi.mock('../crypto/PasswordService', () => ({
  PasswordService: {
    validatePassword: vi.fn().mockReturnValue({ isValid: true, score: 4 }),
  },
}));

describe('FileEncryptionService (Simple)', () => {
  let service: FileEncryptionService;

  beforeEach(() => {
    service = new FileEncryptionService();
    vi.clearAllMocks();

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
    });

    // Mock FileReader
    global.FileReader = vi.fn(() => ({
      readAsArrayBuffer: vi.fn(function(this: any, file: File) {
        const reader = this;
        setTimeout(() => {
          reader.result = new ArrayBuffer(8);
          reader.onload?.();
        }, 0);
      }),
      result: null,
      onload: null,
      onerror: null,
    })) as any;
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      const testFile = createTestFile();
      
      const result = await service.uploadFile(
        testFile,
        TEST_PASSWORD,
        false,
      );
      
      expect(result.fileId).toBe('test-file-id');
      expect(result.shareableUrl).toContain(`http://localhost:3000/p/test-file-id#`);
      expect(result.kyberPrivateKey).toBeInstanceOf(Uint8Array);
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should validate password strength', async () => {
      const { PasswordService } = await import('../crypto/PasswordService');
      (PasswordService.validatePassword as any).mockReturnValueOnce({ isValid: false, score: 1 });
      
      const testFile = createTestFile();
      
      await expect(
        service.uploadFile(testFile, 'weak', false)
      ).rejects.toThrow('Invalid password');
    });

    it('should enforce file size limit', async () => {
      // Create a file larger than 100MB
      const largeFile = new File([new ArrayBuffer(105 * 1024 * 1024)], 'large.txt');
      
      await expect(
        service.uploadFile(largeFile, TEST_PASSWORD, false)
      ).rejects.toThrow('File too large');
    });

    it('should track upload progress', async () => {
      const testFile = createTestFile();
      const progressUpdates: any[] = [];
      
      await service.uploadFile(
        testFile,
        TEST_PASSWORD,
        false,
        (progress) => progressUpdates.push(progress)
      );
      
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some(p => p.stage === 'validating')).toBe(true);
      expect(progressUpdates.some(p => p.stage === 'encrypting')).toBe(true);
      expect(progressUpdates.some(p => p.stage === 'uploading')).toBe(true);
      expect(progressUpdates.some(p => p.stage === 'complete')).toBe(true);
    });
  });

  describe('downloadFile', () => {
    it('should download and decrypt a file successfully', async () => {
      const fileId = 'test-download-id';
      const privateKeyFragment = btoa(String.fromCharCode(...new Uint8Array([13, 14, 15])))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      const result = await service.downloadFile(
        fileId,
        TEST_PASSWORD,
        privateKeyFragment,
      );
      
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(result.data)).toBe('Decrypted content');
      expect(result.metadata.name).toBe('test.txt');
    });

    it('should require private key', async () => {
      await expect(
        service.downloadFile('test-id', TEST_PASSWORD, undefined)
      ).rejects.toThrow('Private key required');
    });

    it('should track download progress', async () => {
      const fileId = 'test-id';
      const privateKeyFragment = btoa(String.fromCharCode(...new Uint8Array([13, 14, 15])))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      const progressUpdates: any[] = [];
      
      await service.downloadFile(
        fileId,
        TEST_PASSWORD,
        privateKeyFragment,
        (progress) => progressUpdates.push(progress)
      );
      
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some(p => p.stage === 'validating')).toBe(true);
      expect(progressUpdates.some(p => p.stage === 'decrypting')).toBe(true);
      expect(progressUpdates.some(p => p.stage === 'complete')).toBe(true);
    });
  });

  describe('createDownloadableFile', () => {
    it('should create a blob with correct mime type', () => {
      const data = new TextEncoder().encode('Test content');
      const metadata = {
        name: 'test.pdf',
        size: data.length,
        mimeType: 'application/pdf',
        uploadDate: Date.now(),
        encryptionConfig: {
          encryptMetadata: false,
          algorithm: 'test',
        },
      };
      
      const blob = FileEncryptionService.createDownloadableFile(data, metadata);
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBe(data.length);
    });
  });

  describe('triggerDownload', () => {
    it('should create and click a download link', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      
      // Mock DOM methods
      const link = { 
        href: '', 
        download: '', 
        click: vi.fn() 
      };
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(link as any);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => link as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => link as any);
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
      
      FileEncryptionService.triggerDownload(blob, 'test.txt');
      
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(link.href).toBe('blob:test');
      expect(link.download).toBe('test.txt');
      expect(link.click).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test');
    });
  });
});