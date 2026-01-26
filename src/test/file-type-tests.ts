/**
 * Test suite for various file types and sizes
 * Validates that different file formats can be encrypted/decrypted correctly
 */

import { FileEncryptionService } from '../services/FileEncryptionService';

interface FileTypeTest {
  name: string;
  mimeType: string;
  generateContent: () => Uint8Array;
  validate: (original: Uint8Array, decrypted: Uint8Array) => boolean;
}

export class FileTypeTests {
  private static fileEncryptionService = new FileEncryptionService();

  /**
   * Define test cases for different file types
   */
  private static fileTypes: FileTypeTest[] = [
    {
      name: 'Plain Text (.txt)',
      mimeType: 'text/plain',
      generateContent: () => new TextEncoder().encode('Hello, this is a test file!\nWith multiple lines.\nAnd special characters: @#$%^&*()'),
      validate: (a, b) => this.arraysEqual(a, b),
    },
    {
      name: 'JSON (.json)',
      mimeType: 'application/json',
      generateContent: () => new TextEncoder().encode(JSON.stringify({
        test: true,
        nested: { data: [1, 2, 3] },
        unicode: '你好世界 🌍',
      }, null, 2)),
      validate: (a, b) => {
        const aStr = new TextDecoder().decode(a);
        const bStr = new TextDecoder().decode(b);
        return JSON.stringify(JSON.parse(aStr)) === JSON.stringify(JSON.parse(bStr));
      },
    },
    {
      name: 'HTML (.html)',
      mimeType: 'text/html',
      generateContent: () => new TextEncoder().encode(`
        <!DOCTYPE html>
        <html>
          <head><title>Test</title></head>
          <body><h1>Test Page</h1><p>Content with <strong>formatting</strong></p></body>
        </html>
      `),
      validate: (a, b) => this.arraysEqual(a, b),
    },
    {
      name: 'CSV (.csv)',
      mimeType: 'text/csv',
      generateContent: () => new TextEncoder().encode(
        'Name,Age,Email\nJohn Doe,30,john@example.com\nJane Smith,25,jane@example.com\n'
      ),
      validate: (a, b) => this.arraysEqual(a, b),
    },
    {
      name: 'Binary Data',
      mimeType: 'application/octet-stream',
      generateContent: () => {
        // Generate pseudo-random binary data
        const size = 1024;
        const data = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
          data[i] = (i * 7 + 13) % 256;
        }
        return data;
      },
      validate: (a, b) => this.arraysEqual(a, b),
    },
    {
      name: 'Image-like Data (PNG header)',
      mimeType: 'image/png',
      generateContent: () => {
        // PNG file signature followed by random data
        const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        const data = new Uint8Array(1024);
        pngSignature.forEach((byte, i) => data[i] = byte);
        for (let i = 8; i < 1024; i++) {
          data[i] = Math.floor(Math.random() * 256);
        }
        return data;
      },
      validate: (a, b) => {
        // Check PNG signature is preserved
        const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        for (let i = 0; i < pngSignature.length; i++) {
          if (b[i] !== pngSignature[i]) return false;
        }
        return this.arraysEqual(a, b);
      },
    },
    {
      name: 'Unicode Text',
      mimeType: 'text/plain',
      generateContent: () => new TextEncoder().encode(
        '🎉 Unicode test: 你好世界, مرحبا بالعالم, Здравствуй мир, 🌍🌎🌏\n' +
        'Emojis: 😀😃😄😁😆😅😂🤣\n' +
        'Math: ∑∏∫∬∭∮∯∰'
      ),
      validate: (a, b) => this.arraysEqual(a, b),
    },
    {
      name: 'Large Text (Lorem Ipsum)',
      mimeType: 'text/plain',
      generateContent: () => {
        const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
        const repeated = lorem.repeat(100);
        return new TextEncoder().encode(repeated);
      },
      validate: (a, b) => this.arraysEqual(a, b),
    },
  ];

  /**
   * Run all file type tests
   */
  static async runAll(): Promise<void> {
    console.log('🧪 Starting file type compatibility tests...\n');
    
    const results: { name: string; passed: boolean; error?: string }[] = [];
    const password = 'FileTypeTest123!@#';

    for (const fileType of this.fileTypes) {
      console.log(`Testing ${fileType.name}...`);
      
      try {
        const passed = await this.testFileType(fileType, password);
        results.push({ name: fileType.name, passed });
        console.log(`  ✅ ${fileType.name} - PASSED`);
      } catch (error) {
        results.push({ 
          name: fileType.name, 
          passed: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log(`  ❌ ${fileType.name} - FAILED: ${error}`);
      }
    }

    // Print summary
    console.log('\n\n📊 TEST SUMMARY\n' + '='.repeat(40));
    const passed = results.filter(r => r.passed).length;
    console.log(`Total: ${results.length} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${results.length - passed}`);
    
    if (results.some(r => !r.passed)) {
      console.log('\nFailed tests:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }
  }

  /**
   * Test a specific file type
   */
  private static async testFileType(
    fileType: FileTypeTest,
    password: string
  ): Promise<boolean> {
    // Generate test content
    const originalData = fileType.generateContent();
    const file = new File([originalData], 'test-file', { type: fileType.mimeType });

    // Mock file reader
    const originalFileReader = global.FileReader;
    global.FileReader = class {
      readAsArrayBuffer(file: File) {
        const reader = this as any;
        setTimeout(() => {
          file.arrayBuffer().then(buffer => {
            reader.result = buffer;
            reader.onload?.();
          });
        }, 0);
      }
    } as any;

    try {
      // Upload (encrypt)
      const uploadResult = await this.fileEncryptionService.uploadFile(
        file,
        password,
        false
      );

      // Extract private key from URL
      const urlParts = uploadResult.shareableUrl.split('#');
      const privateKeyFragment = urlParts[1];

      // Download (decrypt)
      const downloadResult = await this.fileEncryptionService.downloadFile(
        uploadResult.fileId,
        password,
        privateKeyFragment
      );

      // Validate
      const isValid = fileType.validate(originalData, downloadResult.data);
      
      if (!isValid) {
        throw new Error('Data validation failed - content mismatch');
      }

      // Verify metadata
      if (downloadResult.metadata.mimeType !== fileType.mimeType) {
        throw new Error(`Mime type mismatch: expected ${fileType.mimeType}, got ${downloadResult.metadata.mimeType}`);
      }

      return true;
    } finally {
      global.FileReader = originalFileReader;
    }
  }

  /**
   * Test different file sizes
   */
  static async testFileSizes(): Promise<void> {
    console.log('\n\n📏 Testing different file sizes...\n');
    
    const sizes = [
      { size: 0, label: 'Empty file' },
      { size: 1, label: '1 byte' },
      { size: 1024, label: '1 KB' },
      { size: 1024 * 1024, label: '1 MB' },
      { size: 10 * 1024 * 1024, label: '10 MB' },
      { size: 50 * 1024 * 1024, label: '50 MB' },
      { size: 99 * 1024 * 1024, label: '99 MB' },
    ];

    const password = 'SizeTest123!@#';
    const results: { size: string; passed: boolean; time?: number }[] = [];

    for (const { size, label } of sizes) {
      console.log(`Testing ${label}...`);
      const start = performance.now();
      
      try {
        // Generate test data
        const data = new Uint8Array(size);
        if (size > 0) {
          // Fill with pattern
          for (let i = 0; i < size; i++) {
            data[i] = i % 256;
          }
        }

        const file = new File([data], `test-${label}.bin`, { 
          type: 'application/octet-stream' 
        });

        // Test upload/download
        await this.testFileType(
          {
            name: label,
            mimeType: 'application/octet-stream',
            generateContent: () => data,
            validate: (a, b) => this.arraysEqual(a, b),
          },
          password
        );

        const time = performance.now() - start;
        results.push({ size: label, passed: true, time });
        console.log(`  ✅ ${label} - PASSED (${time.toFixed(0)}ms)`);
      } catch (error) {
        results.push({ size: label, passed: false });
        console.log(`  ❌ ${label} - FAILED: ${error}`);
      }
    }

    // Summary
    console.log('\n📊 Size Test Summary:');
    results.forEach(r => {
      const status = r.passed ? '✅' : '❌';
      const time = r.time ? ` (${r.time.toFixed(0)}ms)` : '';
      console.log(`  ${status} ${r.size}${time}`);
    });
  }

  /**
   * Compare two Uint8Arrays
   */
  private static arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}

// Export convenience functions
export const runFileTypeTests = () => FileTypeTests.runAll();
export const runFileSizeTests = () => FileTypeTests.testFileSizes();