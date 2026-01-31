// Global test setup
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

// Mock fetch for tests
global.fetch = vi.fn() as unknown as typeof fetch;

// Mock argon2-browser for tests
vi.mock('argon2-browser', () => {
  return {
    default: {
      hash: async ({
        pass,
        salt,
        hashLen,
      }: {
        pass: string;
        salt: Uint8Array;
        hashLen: number;
      }) => {
        // Simple mock implementation
        const encoder = new TextEncoder();
        const passBytes = encoder.encode(pass);
        const hash = new Uint8Array(hashLen);

        // Generate deterministic hash based on password and salt
        for (let i = 0; i < hashLen; i++) {
          hash[i] = (passBytes[i % passBytes.length] ^ salt[i % salt.length]) % 256;
        }

        return { hash };
      },
      ArgonType: {
        Argon2id: 2,
      },
    },
  };
});

// Mock noble post-quantum library for tests
vi.mock('@noble/post-quantum/ml-kem', () => {
  return {
    ml_kem768: {
      keygen: () => {
        // Generate deterministic test keys
        const publicKey = new Uint8Array(1184);
        const secretKey = new Uint8Array(2400);
        for (let i = 0; i < publicKey.length; i++) {
          publicKey[i] = i % 256;
        }
        for (let i = 0; i < secretKey.length; i++) {
          secretKey[i] = (i * 2) % 256;
        }
        return { publicKey, secretKey };
      },
      encapsulate: (publicKey: Uint8Array) => {
        // Generate deterministic shared secret and ciphertext
        const sharedSecret = new Uint8Array(32);
        const ciphertext = new Uint8Array(1088);
        for (let i = 0; i < sharedSecret.length; i++) {
          sharedSecret[i] = (publicKey[i] + i) % 256;
        }
        for (let i = 0; i < ciphertext.length; i++) {
          ciphertext[i] = (publicKey[i % publicKey.length] ^ i) % 256;
        }
        return { sharedSecret, ciphertext };
      },
      decapsulate: (ciphertext: Uint8Array, secretKey: Uint8Array) => {
        // Generate the same deterministic shared secret
        const sharedSecret = new Uint8Array(32);
        for (let i = 0; i < sharedSecret.length; i++) {
          sharedSecret[i] = (ciphertext[i] + secretKey[i] + i) % 256;
        }
        return sharedSecret;
      },
    },
  };
});

// Mock noble ciphers library for tests
vi.mock('@noble/ciphers/aes', () => {
  return {
    gcm: (key: Uint8Array, nonce: Uint8Array, _AAD?: Uint8Array) => {
      return {
        encrypt: (plaintext: Uint8Array) => {
          // Simple XOR cipher for testing
          const ciphertext = new Uint8Array(plaintext.length);
          for (let i = 0; i < plaintext.length; i++) {
            ciphertext[i] = plaintext[i] ^ key[i % key.length] ^ nonce[i % nonce.length];
          }
          return ciphertext;
        },
        decrypt: (ciphertext: Uint8Array) => {
          // Simple XOR cipher for testing (reversible)
          const plaintext = new Uint8Array(ciphertext.length);
          for (let i = 0; i < ciphertext.length; i++) {
            plaintext[i] = ciphertext[i] ^ key[i % key.length] ^ nonce[i % nonce.length];
          }
          return plaintext;
        },
      };
    },
  };
});

beforeAll(() => {
  // Setup before all tests
});

afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks();
});

afterAll(() => {
  // Cleanup after all tests
});
