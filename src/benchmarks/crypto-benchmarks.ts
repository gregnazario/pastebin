/**
 * Performance benchmarks for cryptographic operations
 * Run these to measure encryption/decryption performance
 */

import { AESService } from '../services/crypto/AESService';
import { HybridEncryptionService } from '../services/crypto/HybridEncryption';
import { KeyDerivationService } from '../services/crypto/KeyDerivation';
import { KyberService } from '../services/crypto/KyberService';
import type { FileMetadata } from '../types';

interface BenchmarkResult {
  operation: string;
  fileSize: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  throughputMBps: number;
}

export class CryptoBenchmarks {
  private static results: BenchmarkResult[] = [];

  /**
   * Run all benchmarks
   */
  static async runAll(): Promise<BenchmarkResult[]> {
    console.log('🚀 Starting crypto performance benchmarks...\n');

    CryptoBenchmarks.results = [];

    // Test different file sizes
    const fileSizes = [
      { size: 1 * 1024, label: '1KB' },
      { size: 100 * 1024, label: '100KB' },
      { size: 1 * 1024 * 1024, label: '1MB' },
      { size: 10 * 1024 * 1024, label: '10MB' },
      { size: 50 * 1024 * 1024, label: '50MB' },
    ];

    // Benchmark each operation
    for (const { size, label } of fileSizes) {
      console.log(`\n📊 Testing with ${label} file...`);

      const data = CryptoBenchmarks.generateTestData(size);
      const password = 'BenchmarkPassword123!@#';

      // Benchmark Kyber key generation
      await CryptoBenchmarks.benchmarkKyberKeyGen(label);

      // Benchmark key derivation
      await CryptoBenchmarks.benchmarkKeyDerivation(label, password);

      // Benchmark hybrid encryption
      await CryptoBenchmarks.benchmarkHybridEncryption(label, data, password);

      // Benchmark AES alone
      await CryptoBenchmarks.benchmarkAES(label, data);
    }

    CryptoBenchmarks.printResults();
    return CryptoBenchmarks.results;
  }

  /**
   * Generate test data of specified size
   */
  private static generateTestData(size: number): Uint8Array {
    const data = new Uint8Array(size);
    // Fill with pseudo-random data
    for (let i = 0; i < size; i++) {
      data[i] = (i * 7 + 13) % 256;
    }
    return data;
  }

  /**
   * Benchmark Kyber key generation
   */
  private static async benchmarkKyberKeyGen(fileSize: string): Promise<void> {
    const iterations = 10;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await KyberService.generateKeyPair();
    }

    const totalTime = performance.now() - start;
    const result: BenchmarkResult = {
      operation: 'Kyber Key Generation',
      fileSize,
      iterations,
      totalTime,
      averageTime: totalTime / iterations,
      throughputMBps: 0, // N/A for key generation
    };

    CryptoBenchmarks.results.push(result);
    console.log(`✓ Kyber keygen: ${result.averageTime.toFixed(2)}ms average`);
  }

  /**
   * Benchmark key derivation
   */
  private static async benchmarkKeyDerivation(fileSize: string, password: string): Promise<void> {
    const iterations = 5;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await KeyDerivationService.deriveKey(password);
    }

    const totalTime = performance.now() - start;
    const result: BenchmarkResult = {
      operation: 'Key Derivation (Argon2/PBKDF2)',
      fileSize,
      iterations,
      totalTime,
      averageTime: totalTime / iterations,
      throughputMBps: 0, // N/A for key derivation
    };

    CryptoBenchmarks.results.push(result);
    console.log(`✓ Key derivation: ${result.averageTime.toFixed(2)}ms average`);
  }

  /**
   * Benchmark hybrid encryption and decryption
   */
  private static async benchmarkHybridEncryption(
    fileSize: string,
    data: Uint8Array,
    password: string,
  ): Promise<void> {
    const iterations = 3;
    const metadata: FileMetadata = {
      name: 'benchmark.bin',
      size: data.length,
      mimeType: 'application/octet-stream',
      uploadDate: Date.now(),
      encryptionConfig: {
        encryptMetadata: false,
        algorithm: 'Kyber768+AES256-GCM',
      },
    };

    // Benchmark encryption
    const encStart = performance.now();
    let encrypted: any;

    for (let i = 0; i < iterations; i++) {
      encrypted = await HybridEncryptionService.encrypt(data, password, metadata, false);
    }

    const encTime = performance.now() - encStart;
    const encResult: BenchmarkResult = {
      operation: 'Hybrid Encryption',
      fileSize,
      iterations,
      totalTime: encTime,
      averageTime: encTime / iterations,
      throughputMBps: data.length / (1024 * 1024) / (encTime / iterations / 1000),
    };

    CryptoBenchmarks.results.push(encResult);
    console.log(
      `✓ Hybrid encryption: ${encResult.averageTime.toFixed(2)}ms, ${encResult.throughputMBps.toFixed(2)} MB/s`,
    );

    // Benchmark decryption
    const decStart = performance.now();

    for (let i = 0; i < iterations; i++) {
      await HybridEncryptionService.decrypt(
        encrypted.payload,
        password,
        encrypted.keys.kyberPrivateKey,
      );
    }

    const decTime = performance.now() - decStart;
    const decResult: BenchmarkResult = {
      operation: 'Hybrid Decryption',
      fileSize,
      iterations,
      totalTime: decTime,
      averageTime: decTime / iterations,
      throughputMBps: data.length / (1024 * 1024) / (decTime / iterations / 1000),
    };

    CryptoBenchmarks.results.push(decResult);
    console.log(
      `✓ Hybrid decryption: ${decResult.averageTime.toFixed(2)}ms, ${decResult.throughputMBps.toFixed(2)} MB/s`,
    );
  }

  /**
   * Benchmark AES encryption alone
   */
  private static async benchmarkAES(fileSize: string, data: Uint8Array): Promise<void> {
    const iterations = 5;
    const key = crypto.getRandomValues(new Uint8Array(32));

    // Benchmark encryption
    const encStart = performance.now();
    let encrypted: any;

    for (let i = 0; i < iterations; i++) {
      encrypted = await AESService.encrypt(data, key);
    }

    const encTime = performance.now() - encStart;
    const encResult: BenchmarkResult = {
      operation: 'AES-256-GCM Encryption',
      fileSize,
      iterations,
      totalTime: encTime,
      averageTime: encTime / iterations,
      throughputMBps: data.length / (1024 * 1024) / (encTime / iterations / 1000),
    };

    CryptoBenchmarks.results.push(encResult);
    console.log(
      `✓ AES encryption: ${encResult.averageTime.toFixed(2)}ms, ${encResult.throughputMBps.toFixed(2)} MB/s`,
    );

    // Benchmark decryption
    const decStart = performance.now();

    for (let i = 0; i < iterations; i++) {
      await AESService.decrypt(encrypted.ciphertext, key, encrypted.nonce);
    }

    const decTime = performance.now() - decStart;
    const decResult: BenchmarkResult = {
      operation: 'AES-256-GCM Decryption',
      fileSize,
      iterations,
      totalTime: decTime,
      averageTime: decTime / iterations,
      throughputMBps: data.length / (1024 * 1024) / (decTime / iterations / 1000),
    };

    CryptoBenchmarks.results.push(decResult);
    console.log(
      `✓ AES decryption: ${decResult.averageTime.toFixed(2)}ms, ${decResult.throughputMBps.toFixed(2)} MB/s`,
    );
  }

  /**
   * Print formatted results
   */
  private static printResults(): void {
    console.log('\n\n📈 BENCHMARK RESULTS\n' + '='.repeat(80));

    // Group by operation
    const operations = [...new Set(CryptoBenchmarks.results.map((r) => r.operation))];

    for (const op of operations) {
      console.log(`\n${op}:`);
      console.log('-'.repeat(op.length + 1));

      const opResults = CryptoBenchmarks.results.filter((r) => r.operation === op);

      for (const result of opResults) {
        const throughput =
          result.throughputMBps > 0 ? `, ${result.throughputMBps.toFixed(2)} MB/s` : '';

        console.log(
          `  ${result.fileSize.padEnd(6)} - ` +
            `${result.averageTime.toFixed(2)}ms avg` +
            throughput +
            ` (${result.iterations} iterations)`,
        );
      }
    }

    // Summary statistics
    console.log('\n\n📊 SUMMARY\n' + '='.repeat(80));

    // Find bottlenecks
    const encryptionResults = CryptoBenchmarks.results.filter((r) =>
      r.operation.includes('Encryption'),
    );
    const slowest = encryptionResults.reduce((prev, curr) =>
      curr.throughputMBps > 0 && curr.throughputMBps < prev.throughputMBps ? curr : prev,
    );

    console.log(
      `Slowest operation: ${slowest.operation} at ${slowest.throughputMBps.toFixed(2)} MB/s`,
    );

    // Calculate average throughput for hybrid encryption
    const hybridEnc = CryptoBenchmarks.results.filter(
      (r) => r.operation === 'Hybrid Encryption' && r.throughputMBps > 0,
    );
    const avgThroughput =
      hybridEnc.reduce((sum, r) => sum + r.throughputMBps, 0) / hybridEnc.length;

    console.log(`Average hybrid encryption throughput: ${avgThroughput.toFixed(2)} MB/s`);
    console.log(`Estimated time for 100MB file: ${(100 / avgThroughput).toFixed(1)} seconds`);
  }
}

// Export for use in tests or dev tools
export const runBenchmarks = () => CryptoBenchmarks.runAll();
