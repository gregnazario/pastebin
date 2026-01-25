import { describe, it, expect } from 'vitest';
import { AESService } from '../AESService';

describe('AESService', () => {
  const testData = new TextEncoder().encode('Hello, World! This is a test message.');
  const testKey = AESService.generateKey();

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const encrypted = await AESService.encrypt(testData, testKey);
      
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.nonce).toBeDefined();
      expect(encrypted.nonce).toHaveLength(12); // 96 bits
      
      const decrypted = await AESService.decrypt(
        encrypted.ciphertext,
        testKey,
        encrypted.nonce,
      );
      
      expect(decrypted).toEqual(testData);
    });

    it('should produce different ciphertext for same data', async () => {
      const encrypted1 = await AESService.encrypt(testData, testKey);
      const encrypted2 = await AESService.encrypt(testData, testKey);
      
      // Different nonces
      expect(encrypted1.nonce).not.toEqual(encrypted2.nonce);
      // Different ciphertexts
      expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
    });

    it('should handle additional authenticated data', async () => {
      const aad = new TextEncoder().encode('Additional context');
      const encrypted = await AESService.encrypt(testData, testKey, aad);
      
      // Should decrypt successfully with correct AAD
      const decrypted = await AESService.decrypt(
        encrypted.ciphertext,
        testKey,
        encrypted.nonce,
        aad,
      );
      
      expect(decrypted).toEqual(testData);
      
      // Should fail with incorrect AAD
      const wrongAad = new TextEncoder().encode('Wrong context');
      await expect(
        AESService.decrypt(encrypted.ciphertext, testKey, encrypted.nonce, wrongAad)
      ).rejects.toThrow();
    });

    it('should reject invalid key sizes', async () => {
      const invalidKey = new Uint8Array(16); // 128 bits instead of 256
      
      await expect(
        AESService.encrypt(testData, invalidKey)
      ).rejects.toThrow('Invalid key size');
    });

    it('should reject invalid nonce sizes on decrypt', async () => {
      const encrypted = await AESService.encrypt(testData, testKey);
      const invalidNonce = new Uint8Array(8); // Too short
      
      await expect(
        AESService.decrypt(encrypted.ciphertext, testKey, invalidNonce)
      ).rejects.toThrow('Invalid nonce size');
    });
  });

  describe('encryptCombined/decryptCombined', () => {
    it('should handle combined format correctly', async () => {
      const combined = await AESService.encryptCombined(testData, testKey);
      
      // Combined should be nonce + ciphertext
      expect(combined.length).toBeGreaterThan(12);
      
      const decrypted = await AESService.decryptCombined(combined, testKey);
      expect(decrypted).toEqual(testData);
    });

    it('should handle AAD in combined format', async () => {
      const aad = new TextEncoder().encode('Metadata');
      const combined = await AESService.encryptCombined(testData, testKey, aad);
      
      const decrypted = await AESService.decryptCombined(combined, testKey, aad);
      expect(decrypted).toEqual(testData);
    });

    it('should reject too short combined data', async () => {
      const tooShort = new Uint8Array(8);
      
      await expect(
        AESService.decryptCombined(tooShort, testKey)
      ).rejects.toThrow('Combined data too short');
    });
  });

  describe('generateKey', () => {
    it('should generate 256-bit keys', () => {
      const key = AESService.generateKey();
      expect(key).toHaveLength(32); // 256 bits
    });

    it('should generate different keys', () => {
      const key1 = AESService.generateKey();
      const key2 = AESService.generateKey();
      
      expect(key1).not.toEqual(key2);
    });
  });

  describe('getSizes', () => {
    it('should return correct size parameters', () => {
      const sizes = AESService.getSizes();
      
      expect(sizes.keySize).toBe(32);
      expect(sizes.nonceSize).toBe(12);
      expect(sizes.tagSize).toBe(16);
    });
  });

  describe('authentication', () => {
    it('should detect tampered ciphertext', async () => {
      const encrypted = await AESService.encrypt(testData, testKey);
      
      // Tamper with ciphertext
      encrypted.ciphertext[0] ^= 0x01;
      
      await expect(
        AESService.decrypt(encrypted.ciphertext, testKey, encrypted.nonce)
      ).rejects.toThrow();
    });

    it('should detect wrong key', async () => {
      const encrypted = await AESService.encrypt(testData, testKey);
      const wrongKey = AESService.generateKey();
      
      await expect(
        AESService.decrypt(encrypted.ciphertext, wrongKey, encrypted.nonce)
      ).rejects.toThrow();
    });
  });
});