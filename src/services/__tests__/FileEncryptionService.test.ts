import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileEncryptionService } from '../FileEncryptionService';
import {
  createTestFile,
  createTestFileData,
  mockFileReader,
  mockShelbyUpload,
  mockShelbyDownload,
  TEST_PASSWORD,
  TEST_FILE_CONTENT,
  waitForAsync,
} from '../../test/crypto-test-utils';
import { HybridEncryptionService } from '../crypto/HybridEncryption';

describe('FileEncryptionService', () => {
  let service: FileEncryptionService;

  beforeEach(() => {
    service = new FileEncryptionService();
    mockFileReader();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload and encrypt a file successfully', async () => {
      const testFile = createTestFile();
      const fileId = 'test-upload-id';
      
      // Mock Shelby upload
      mockShelbyUpload(fileId);
      
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:3000' },
        writable: true,
      });
      
      const result = await service.uploadFile(
        testFile,
        TEST_PASSWORD,
        false,
      );
      
      expect(result.fileId).toBe(fileId);
      expect(result.shareableUrl).toContain(`http://localhost:3000/p/${fileId}#`);
      expect(result.kyberPrivateKey).toBeInstanceOf(Uint8Array);
      expect(result.expiresAt).toBeGreaterThan(Date.now());
      
      // Verify Shelby was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/blobs'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.any(Uint8Array),
        })
      );
    });

    it('should validate password strength', async () => {
      const testFile = createTestFile();
      const weakPassword = 'weak';
      
      await expect(
        service.uploadFile(testFile, weakPassword, false)
      ).rejects.toThrow('Invalid password');
    });

    it('should enforce file size limit', async () => {
      // Create a file larger than 100MB
      const largeContent = 'x'.repeat(105 * 1024 * 1024); // 105MB
      const largeFile = createTestFile(largeContent, 'large.txt');
      
      await expect(
        service.uploadFile(largeFile, TEST_PASSWORD, false)
      ).rejects.toThrow('File too large');
    });

    it('should handle upload progress', async () => {
      const testFile = createTestFile();
      mockShelbyUpload('test-id');
      
      const progressUpdates: any[] = [];
      
      await service.uploadFile(
        testFile,
        TEST_PASSWORD,
        false,
        (progress) => progressUpdates.push(progress)
      );
      
      // Should have progress updates for each stage
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some(p => p.stage === 'validating')).toBe(true);
      expect(progressUpdates.some(p => p.stage === 'encrypting')).toBe(true);
      expect(progressUpdates.some(p => p.stage === 'uploading')).toBe(true);
      expect(progressUpdates.some(p => p.stage === 'complete')).toBe(true);
    });

    it('should encrypt metadata when requested', async () => {
      const testFile = createTestFile();
      mockShelbyUpload('test-id');
      
      await service.uploadFile(
        testFile,
        TEST_PASSWORD,
        true, // encrypt metadata
      );
      
      // Verify metadata encryption was passed through
      const uploadCall = (global.fetch as any).mock.calls[0];
      const uploadBody = uploadCall[1].body;
      
      // The serialized payload should indicate encrypted metadata
      const payload = HybridEncryptionService.deserializePayload(uploadBody);
      expect(payload.metadataEncrypted).toBe(true);
    });
  });

  describe('downloadFile', () => {
    it('should download and decrypt a file successfully', async () => {
      const fileId = 'test-download-id';
      const originalData = createTestFileData(TEST_FILE_CONTENT);
      
      // First encrypt the data to get a valid payload
      const { payload, keys } = await HybridEncryptionService.encrypt(
        originalData,
        TEST_PASSWORD,
        {
          name: 'test.txt',
          size: originalData.length,
          mimeType: 'text/plain',
          uploadDate: Date.now(),
          encryptionConfig: {
            encryptMetadata: false,
            algorithm: 'Kyber768+AES256-GCM',
          },
        },
        false
      );
      
      // Mock Shelby download to return encrypted data
      const serializedPayload = HybridEncryptionService.serializePayload(payload);
      mockShelbyDownload(serializedPayload);
      
      // Convert private key to base64url
      const privateKeyFragment = btoa(String.fromCharCode(...keys.kyberPrivateKey))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      const result = await service.downloadFile(
        fileId,
        TEST_PASSWORD,
        privateKeyFragment,
      );
      
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(result.data)).toBe(TEST_FILE_CONTENT);
      expect(result.metadata.name).toBe('test.txt');
    });

    it('should require private key', async () => {
      await expect(
        service.downloadFile('test-id', TEST_PASSWORD, undefined)
      ).rejects.toThrow('Private key required');
    });

    it('should handle download progress', async () => {
      const fileId = 'test-id';
      const data = createTestFileData();
      
      // Create encrypted payload
      const { payload, keys } = await HybridEncryptionService.encrypt(
        data,
        TEST_PASSWORD,
        {
          name: 'test.txt',
          size: data.length,
          mimeType: 'text/plain',
          uploadDate: Date.now(),
          encryptionConfig: {
            encryptMetadata: false,
            algorithm: 'Kyber768+AES256-GCM',
          },
        },
        false
      );
      
      mockShelbyDownload(HybridEncryptionService.serializePayload(payload));
      
      const progressUpdates: any[] = [];
      const privateKeyFragment = btoa(String.fromCharCode(...keys.kyberPrivateKey))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      await service.downloadFile(
        fileId,
        TEST_PASSWORD,
        privateKeyFragment,
        (progress) => progressUpdates.push(progress)
      );
      
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some(p => p.stage === 'validating')).toBe(true);
      expect(progressUpdates.some(p => p.stage === 'encrypting')).toBe(true);
      expect(progressUpdates.some(p => p.stage === 'complete')).toBe(true);
    });
  });

  describe('round trip encryption/decryption', () => {
    it('should successfully encrypt and decrypt various file types', async () => {
      const testCases = [
        { content: 'Plain text file', filename: 'text.txt', mimeType: 'text/plain' },
        { content: '{"json": "data"}', filename: 'data.json', mimeType: 'application/json' },
        { content: '<html>HTML content</html>', filename: 'page.html', mimeType: 'text/html' },
        { content: 'Binary\x00\x01\x02\x03data', filename: 'binary.bin', mimeType: 'application/octet-stream' },
      ];
      
      for (const testCase of testCases) {
        const file = createTestFile(testCase.content, testCase.filename, testCase.mimeType);
        const fileId = `test-${testCase.filename}`;
        
        // Mock successful upload
        mockShelbyUpload(fileId);
        
        // Upload
        const uploadResult = await service.uploadFile(file, TEST_PASSWORD, false);
        
        // Extract private key from URL
        const urlParts = uploadResult.shareableUrl.split('#');
        const privateKeyFragment = urlParts[1];
        
        // Get the encrypted data that was uploaded
        const uploadedData = (global.fetch as any).mock.calls[0][1].body;
        
        // Mock download to return the same encrypted data
        mockShelbyDownload(uploadedData);
        
        // Download
        const downloadResult = await service.downloadFile(
          fileId,
          TEST_PASSWORD,
          privateKeyFragment,
        );
        
        // Verify content matches
        const decryptedContent = new TextDecoder().decode(downloadResult.data);
        expect(decryptedContent).toBe(testCase.content);
        expect(downloadResult.metadata.name).toBe(testCase.filename);
        expect(downloadResult.metadata.mimeType).toBe(testCase.mimeType);
      }
    });

    it('should fail decryption with wrong password', async () => {
      const file = createTestFile();
      const fileId = 'test-wrong-pass';
      
      mockShelbyUpload(fileId);
      
      // Upload with correct password
      const uploadResult = await service.uploadFile(file, TEST_PASSWORD, false);
      const privateKeyFragment = uploadResult.shareableUrl.split('#')[1];
      const uploadedData = (global.fetch as any).mock.calls[0][1].body;
      
      mockShelbyDownload(uploadedData);
      
      // Try to download with wrong password
      await expect(
        service.downloadFile(fileId, 'WrongPassword123!', privateKeyFragment)
      ).rejects.toThrow();
    });
  });

  describe('createDownloadableFile', () => {
    it('should create a blob with correct mime type', () => {
      const data = createTestFileData('Test content');
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