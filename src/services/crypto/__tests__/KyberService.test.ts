import { describe, it, expect } from 'vitest';
import { KyberService } from '../KyberService';

describe('KyberService', () => {
  describe('generateKeyPair', () => {
    it('should generate valid key pairs', async () => {
      const keyPair = await KyberService.generateKeyPair();
      
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      
      const sizes = KyberService.getSizes();
      expect(keyPair.publicKey).toHaveLength(sizes.publicKeySize);
      expect(keyPair.privateKey).toHaveLength(sizes.privateKeySize);
    });

    it('should generate different key pairs', async () => {
      const keyPair1 = await KyberService.generateKeyPair();
      const keyPair2 = await KyberService.generateKeyPair();
      
      expect(keyPair1.publicKey).not.toEqual(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toEqual(keyPair2.privateKey);
    });
  });

  describe('encapsulate/decapsulate', () => {
    it('should encapsulate and decapsulate correctly', async () => {
      const keyPair = await KyberService.generateKeyPair();
      
      // Encapsulate
      const encapsulation = await KyberService.encapsulate(keyPair.publicKey);
      
      expect(encapsulation.sharedSecret).toBeDefined();
      expect(encapsulation.ciphertext).toBeDefined();
      
      const sizes = KyberService.getSizes();
      expect(encapsulation.sharedSecret).toHaveLength(sizes.sharedSecretSize);
      expect(encapsulation.ciphertext).toHaveLength(sizes.ciphertextSize);
      
      // Decapsulate
      const sharedSecret = await KyberService.decapsulate(
        encapsulation.ciphertext,
        keyPair.privateKey,
      );
      
      expect(sharedSecret).toEqual(encapsulation.sharedSecret);
    });

    it('should produce different ciphertexts for same public key', async () => {
      const keyPair = await KyberService.generateKeyPair();
      
      const encap1 = await KyberService.encapsulate(keyPair.publicKey);
      const encap2 = await KyberService.encapsulate(keyPair.publicKey);
      
      // Different ciphertexts
      expect(encap1.ciphertext).not.toEqual(encap2.ciphertext);
      // Different shared secrets
      expect(encap1.sharedSecret).not.toEqual(encap2.sharedSecret);
    });

    it('should fail with wrong private key', async () => {
      const keyPair1 = await KyberService.generateKeyPair();
      const keyPair2 = await KyberService.generateKeyPair();
      
      const encapsulation = await KyberService.encapsulate(keyPair1.publicKey);
      
      // Try to decapsulate with wrong private key
      const wrongSecret = await KyberService.decapsulate(
        encapsulation.ciphertext,
        keyPair2.privateKey,
      );
      
      // The secret should be different (Kyber provides implicit rejection)
      expect(wrongSecret).not.toEqual(encapsulation.sharedSecret);
    });
  });

  describe('getSizes', () => {
    it('should return correct Kyber768 parameters', () => {
      const sizes = KyberService.getSizes();
      
      expect(sizes.publicKeySize).toBe(1184);
      expect(sizes.privateKeySize).toBe(2400);
      expect(sizes.ciphertextSize).toBe(1088);
      expect(sizes.sharedSecretSize).toBe(32);
    });
  });

  describe('validation methods', () => {
    it('should validate public keys correctly', () => {
      const validKey = new Uint8Array(1184);
      const invalidKey = new Uint8Array(1000);
      
      expect(KyberService.validatePublicKey(validKey)).toBe(true);
      expect(KyberService.validatePublicKey(invalidKey)).toBe(false);
    });

    it('should validate private keys correctly', () => {
      const validKey = new Uint8Array(2400);
      const invalidKey = new Uint8Array(2000);
      
      expect(KyberService.validatePrivateKey(validKey)).toBe(true);
      expect(KyberService.validatePrivateKey(invalidKey)).toBe(false);
    });

    it('should validate ciphertext correctly', () => {
      const validCiphertext = new Uint8Array(1088);
      const invalidCiphertext = new Uint8Array(1000);
      
      expect(KyberService.validateCiphertext(validCiphertext)).toBe(true);
      expect(KyberService.validateCiphertext(invalidCiphertext)).toBe(false);
    });
  });

  describe('security properties', () => {
    it('should provide forward secrecy', async () => {
      const keyPair = await KyberService.generateKeyPair();
      
      // Multiple encapsulations should produce different shared secrets
      const secrets = [];
      for (let i = 0; i < 5; i++) {
        const encap = await KyberService.encapsulate(keyPair.publicKey);
        secrets.push(encap.sharedSecret);
      }
      
      // All secrets should be unique
      const uniqueSecrets = new Set(secrets.map(s => Buffer.from(s).toString('hex')));
      expect(uniqueSecrets.size).toBe(5);
    });
  });
});