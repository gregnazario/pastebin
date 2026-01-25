// Global test setup
import { beforeAll, afterEach, afterAll, vi } from 'vitest';

// Mock fetch for tests
global.fetch = vi.fn();

// Mock argon2-browser for tests
vi.mock('argon2-browser', () => {
  return {
    default: {
      hash: async ({ pass, salt, type, time, mem, hashLen, parallelism }) => {
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