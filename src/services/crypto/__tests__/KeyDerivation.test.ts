import { describe, it, expect, vi } from 'vitest';
import { KeyDerivationService } from '../KeyDerivation';

describe('KeyDerivationService', () => {
  describe('deriveKey', () => {
    it('should derive a key from password', async () => {
      const password = 'TestPassword123!';
      const result = await KeyDerivationService.deriveKey(password);
      
      expect(result.key).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.parameters).toBeDefined();
      
      expect(result.key).toHaveLength(32); // 256 bits
      expect(result.salt).toHaveLength(32); // 256 bits
      
      expect(result.parameters.iterations).toBe(3);
      expect(result.parameters.memory).toBe(65536); // 64MB
      expect(result.parameters.parallelism).toBe(1);
      expect(result.parameters.hashLength).toBe(32);
    });

    it('should generate random salt if not provided', async () => {
      const password = 'TestPassword123!';
      const result1 = await KeyDerivationService.deriveKey(password);
      const result2 = await KeyDerivationService.deriveKey(password);
      
      // Different salts
      expect(result1.salt).not.toEqual(result2.salt);
      // Different keys (due to different salts)
      expect(result1.key).not.toEqual(result2.key);
    });

    it('should use provided salt', async () => {
      const password = 'TestPassword123!';
      const salt = crypto.getRandomValues(new Uint8Array(32));
      
      const result1 = await KeyDerivationService.deriveKey(password, salt);
      const result2 = await KeyDerivationService.deriveKey(password, salt);
      
      // Same salt
      expect(result1.salt).toEqual(salt);
      expect(result2.salt).toEqual(salt);
      // Same keys
      expect(result1.key).toEqual(result2.key);
    });

    it('should produce different keys for different passwords', async () => {
      const salt = crypto.getRandomValues(new Uint8Array(32));
      
      const result1 = await KeyDerivationService.deriveKey('Password1!', salt);
      const result2 = await KeyDerivationService.deriveKey('Password2!', salt);
      
      expect(result1.key).not.toEqual(result2.key);
    });
  });

  describe('deriveKeyCustom', () => {
    it('should derive key with custom parameters', async () => {
      const password = 'TestPassword123!';
      const salt = crypto.getRandomValues(new Uint8Array(32));
      const iterations = 2;
      const memory = 32 * 1024; // 32MB
      const parallelism = 1;
      
      const key = await KeyDerivationService.deriveKeyCustom(
        password,
        salt,
        iterations,
        memory,
        parallelism,
      );
      
      expect(key).toBeDefined();
      expect(key).toHaveLength(32);
    });

    it('should produce consistent results with same parameters', async () => {
      const password = 'TestPassword123!';
      const salt = crypto.getRandomValues(new Uint8Array(32));
      const params = {
        iterations: 2,
        memory: 32 * 1024,
        parallelism: 1,
      };
      
      const key1 = await KeyDerivationService.deriveKeyCustom(
        password,
        salt,
        params.iterations,
        params.memory,
        params.parallelism,
      );
      
      const key2 = await KeyDerivationService.deriveKeyCustom(
        password,
        salt,
        params.iterations,
        params.memory,
        params.parallelism,
      );
      
      expect(key1).toEqual(key2);
    });
  });

  describe('generateSalt', () => {
    it('should generate 32-byte salt', () => {
      const salt = KeyDerivationService.generateSalt();
      expect(salt).toHaveLength(32);
    });

    it('should generate different salts', () => {
      const salt1 = KeyDerivationService.generateSalt();
      const salt2 = KeyDerivationService.generateSalt();
      
      expect(salt1).not.toEqual(salt2);
    });
  });

  describe('keyToBase64Url/base64UrlToKey', () => {
    it('should convert key to base64url and back', () => {
      const key = crypto.getRandomValues(new Uint8Array(32));
      
      const base64url = KeyDerivationService.keyToBase64Url(key);
      expect(base64url).toMatch(/^[A-Za-z0-9_-]+$/); // Valid base64url chars
      expect(base64url).not.toContain('='); // No padding
      
      const decoded = KeyDerivationService.base64UrlToKey(base64url);
      expect(decoded).toEqual(key);
    });

    it('should handle various key sizes', () => {
      const sizes = [16, 24, 32, 48, 64];
      
      for (const size of sizes) {
        const key = crypto.getRandomValues(new Uint8Array(size));
        const encoded = KeyDerivationService.keyToBase64Url(key);
        const decoded = KeyDerivationService.base64UrlToKey(encoded);
        
        expect(decoded).toEqual(key);
      }
    });

    it('should produce URL-safe strings', () => {
      // Create a key that would produce + and / in base64
      const key = new Uint8Array([255, 254, 253, 252, 251, 250]);
      const base64url = KeyDerivationService.keyToBase64Url(key);
      
      expect(base64url).not.toContain('+');
      expect(base64url).not.toContain('/');
      expect(base64url).not.toContain('=');
    });
  });

  describe('error handling', () => {
    it('should handle Argon2 errors gracefully', async () => {
      // Mock a failure scenario
      const invalidSalt = new Uint8Array(0); // Empty salt might cause issues
      
      try {
        await KeyDerivationService.deriveKey('password', invalidSalt);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Key derivation failed');
      }
    });
  });

  describe('performance', () => {
    it('should complete within reasonable time', async () => {
      const start = Date.now();
      const password = 'TestPassword123!';
      
      await KeyDerivationService.deriveKey(password);
      
      const duration = Date.now() - start;
      // Should complete within 5 seconds even on slower machines
      expect(duration).toBeLessThan(5000);
    }, 10000); // 10 second timeout for this test
  });
});