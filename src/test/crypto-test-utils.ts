import { vi } from 'vitest';

/**
 * Test utilities for crypto operations
 */

export const TEST_PASSWORD = 'TestPassword123!@#$';
export const TEST_FILE_CONTENT = 'Hello, this is a test file content!';

/**
 * Create a test file
 */
export function createTestFile(
  content: string = TEST_FILE_CONTENT,
  filename: string = 'test.txt',
  mimeType: string = 'text/plain'
): File {
  const blob = new Blob([content], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

/**
 * Create test file data as Uint8Array
 */
export function createTestFileData(content: string = TEST_FILE_CONTENT): Uint8Array {
  return new TextEncoder().encode(content);
}

/**
 * Mock crypto.getRandomValues for deterministic tests
 */
export function mockRandomValues(sequence: number[]): void {
  let index = 0;
  vi.spyOn(crypto, 'getRandomValues').mockImplementation((array: any) => {
    const arr = array as Uint8Array;
    for (let i = 0; i < arr.length; i++) {
      arr[i] = sequence[index % sequence.length];
      index++;
    }
    return arr;
  });
}

/**
 * Compare two Uint8Arrays
 */
export function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Convert string to hex for debugging
 */
export function stringToHex(str: string): string {
  return Array.from(str)
    .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join(' ');
}

/**
 * Create a mock FileReader for testing
 */
export function mockFileReader(): void {
  global.FileReader = vi.fn(() => ({
    readAsArrayBuffer: vi.fn(function(this: any, file: File) {
      const reader = this;
      setTimeout(() => {
        file.arrayBuffer().then(buffer => {
          reader.result = buffer;
          reader.onload?.();
        });
      }, 0);
    }),
    result: null,
    onload: null,
    onerror: null,
  })) as any;
}

/**
 * Wait for async operations to complete
 */
export async function waitForAsync(ms: number = 10): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock successful Shelby upload
 */
export function mockShelbyUpload(fileId: string = 'test-file-id'): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ id: fileId, blobId: fileId }),
  });
}

/**
 * Mock successful Shelby download
 */
export function mockShelbyDownload(data: Uint8Array): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: async () => data.buffer,
  });
}

/**
 * Create test metadata
 */
export function createTestMetadata(overrides?: Partial<any>) {
  return {
    name: 'test.txt',
    size: 35,
    mimeType: 'text/plain',
    uploadDate: Date.now(),
    expirationDate: Date.now() + 24 * 60 * 60 * 1000,
    encryptionConfig: {
      encryptMetadata: false,
      algorithm: 'Kyber768+AES256-GCM',
    },
    ...overrides,
  };
}