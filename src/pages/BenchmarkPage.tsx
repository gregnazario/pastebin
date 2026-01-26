import React, { useState } from 'react';
import { CryptoBenchmarks } from '../benchmarks/crypto-benchmarks';
import { FileTypeTests } from '../test/file-type-tests';

interface BenchmarkResult {
  operation: string;
  fileSize: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  throughputMBps: number;
}

export function BenchmarkPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'performance' | 'fileTypes'>('performance');

  const runBenchmarks = async () => {
    setIsRunning(true);
    setResults([]);
    setLogs([]);

    // Capture console logs
    const originalLog = console.log;
    console.log = (...args) => {
      originalLog(...args);
      setLogs(prev => [...prev, args.join(' ')]);
    };

    try {
      if (activeTab === 'performance') {
        const benchmarkResults = await CryptoBenchmarks.runAll();
        setResults(benchmarkResults);
      } else {
        await FileTypeTests.runAll();
        await FileTypeTests.testFileSizes();
      }
    } catch (error) {
      console.error('Benchmark error:', error);
      setLogs(prev => [...prev, `Error: ${error}`]);
    } finally {
      console.log = originalLog;
      setIsRunning(false);
    }
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.operation]) {
      acc[result.operation] = [];
    }
    acc[result.operation].push(result);
    return acc;
  }, {} as Record<string, BenchmarkResult[]>);

  return (
    <div className="benchmark-page">
      <h2>Testing & Benchmarks</h2>
      
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          Performance Benchmarks
        </button>
        <button
          className={`tab ${activeTab === 'fileTypes' ? 'active' : ''}`}
          onClick={() => setActiveTab('fileTypes')}
        >
          File Type Tests
        </button>
      </div>
      
      <div className="benchmark-info">
        {activeTab === 'performance' ? (
          <>
            <p>
              Test the performance of the encryption algorithms with various file sizes.
              This will measure the speed of Kyber key generation, key derivation, and
              AES-GCM encryption/decryption.
            </p>
            
            <div className="warning-box">
              <strong>Note:</strong> These benchmarks run in your browser using the mocked
              implementations. Real performance with native libraries may differ.
            </div>
          </>
        ) : (
          <>
            <p>
              Test encryption and decryption with various file types and sizes.
              This ensures that different file formats are correctly preserved
              through the encryption process.
            </p>
            
            <div className="info-box">
              <strong>Tests include:</strong> Plain text, JSON, HTML, CSV, Binary data,
              Unicode text, and files from 0 bytes to 99MB.
            </div>
          </>
        )}
      </div>

      <button
        onClick={runBenchmarks}
        disabled={isRunning}
        className="button primary"
      >
        {isRunning ? 'Running Tests...' : `Run ${activeTab === 'performance' ? 'Benchmarks' : 'File Type Tests'}`}
      </button>

      {logs.length > 0 && (
        <div className="benchmark-logs">
          <h3>Progress Log</h3>
          <pre>
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </pre>
        </div>
      )}

      {results.length > 0 && activeTab === 'performance' && (
        <div className="benchmark-results">
          <h3>Results</h3>
          
          {Object.entries(groupedResults).map(([operation, opResults]) => (
            <div key={operation} className="result-group">
              <h4>{operation}</h4>
              <table>
                <thead>
                  <tr>
                    <th>File Size</th>
                    <th>Average Time</th>
                    {opResults[0].throughputMBps > 0 && <th>Throughput</th>}
                    <th>Iterations</th>
                  </tr>
                </thead>
                <tbody>
                  {opResults.map((result, i) => (
                    <tr key={i}>
                      <td>{result.fileSize}</td>
                      <td>{result.averageTime.toFixed(2)} ms</td>
                      {result.throughputMBps > 0 && (
                        <td>{result.throughputMBps.toFixed(2)} MB/s</td>
                      )}
                      <td>{result.iterations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div className="summary">
            <h4>Performance Summary</h4>
            <ul>
              {(() => {
                const hybridEnc = results.filter(
                  r => r.operation === 'Hybrid Encryption' && r.throughputMBps > 0
                );
                const avgThroughput = hybridEnc.length > 0
                  ? hybridEnc.reduce((sum, r) => sum + r.throughputMBps, 0) / hybridEnc.length
                  : 0;

                const slowest = results
                  .filter(r => r.throughputMBps > 0)
                  .reduce((prev, curr) =>
                    curr.throughputMBps < prev.throughputMBps ? curr : prev
                  , results[0]);

                return (
                  <>
                    {avgThroughput > 0 && (
                      <>
                        <li>
                          Average encryption speed: <strong>{avgThroughput.toFixed(2)} MB/s</strong>
                        </li>
                        <li>
                          Time to encrypt 100MB: <strong>{(100 / avgThroughput).toFixed(1)} seconds</strong>
                        </li>
                      </>
                    )}
                    {slowest && slowest.throughputMBps > 0 && (
                      <li>
                        Bottleneck: <strong>{slowest.operation}</strong> at {slowest.throughputMBps.toFixed(2)} MB/s
                      </li>
                    )}
                  </>
                );
              })()}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'fileTypes' && logs.length > 0 && logs.some(log => log.includes('TEST SUMMARY')) && (
        <div className="test-results">
          <h3>Test Results</h3>
          <div className="test-summary">
            <pre>{logs.filter(log => 
              log.includes('✅') || 
              log.includes('❌') || 
              log.includes('TEST SUMMARY') ||
              log.includes('Total:') ||
              log.includes('Passed:') ||
              log.includes('Failed:')
            ).join('\n')}</pre>
          </div>
        </div>
      )}

      <style jsx>{`
        .benchmark-page {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
        }

        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          border-bottom: 2px solid #ddd;
        }

        .tab {
          background: none;
          border: none;
          padding: 10px 20px;
          cursor: pointer;
          font-size: 16px;
          color: #666;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
        }

        .tab:hover {
          color: #333;
        }

        .tab.active {
          color: #2c3e50;
          font-weight: bold;
          border-bottom-color: #2c3e50;
        }

        .benchmark-info {
          margin-bottom: 30px;
        }

        .warning-box, .info-box {
          background: #fff9c4;
          border: 1px solid #f9a825;
          border-radius: 4px;
          padding: 10px;
          margin: 20px 0;
        }

        .info-box {
          background: #e3f2fd;
          border-color: #1976d2;
        }

        .benchmark-logs {
          margin: 20px 0;
          background: #f5f5f5;
          border-radius: 4px;
          padding: 15px;
        }

        .benchmark-logs pre {
          margin: 0;
          font-size: 12px;
          max-height: 300px;
          overflow-y: auto;
        }

        .benchmark-results {
          margin-top: 30px;
        }

        .result-group {
          margin: 20px 0;
        }

        .result-group h4 {
          margin-bottom: 10px;
          color: #333;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }

        th, td {
          text-align: left;
          padding: 8px 12px;
          border-bottom: 1px solid #ddd;
        }

        th {
          background-color: #f5f5f5;
          font-weight: bold;
        }

        tr:hover {
          background-color: #f9f9f9;
        }

        .summary {
          background: #e3f2fd;
          border-radius: 4px;
          padding: 15px;
          margin-top: 30px;
        }

        .summary h4 {
          margin-top: 0;
        }

        .summary ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .summary li {
          margin: 5px 0;
        }

        .test-results {
          margin-top: 30px;
        }

        .test-summary {
          background: #f5f5f5;
          border-radius: 4px;
          padding: 15px;
          font-family: monospace;
          font-size: 14px;
        }

        .test-summary pre {
          margin: 0;
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
}