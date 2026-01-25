import React, { useState } from 'react';
import { ShelbyService } from '../services/storage/ShelbyService';

export function TestShelby() {
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async () => {
    setIsLoading(true);
    setStatus('Starting Shelby integration test...');
    
    const service = new ShelbyService();
    const testContent = 'Hello from Secure Pastebin browser test!';
    const encoder = new TextEncoder();
    const testData = encoder.encode(testContent);
    
    try {
      // Test upload
      setStatus('Uploading test file...');
      const uploadResult = await service.uploadFile(testData, {
        filename: 'browser-test.txt',
        contentType: 'text/plain',
      });
      
      // Test download
      setStatus('Downloading test file...');
      const downloadedData = await service.downloadFile(uploadResult.id);
      const decoder = new TextDecoder();
      const downloadedContent = decoder.decode(downloadedData);
      
      const success = downloadedContent === testContent;
      
      setResult({
        success,
        uploadResult,
        downloadedContent,
        originalContent: testContent,
      });
      
      setStatus(success ? '✅ Test passed!' : '❌ Test failed - content mismatch');
    } catch (error) {
      setStatus(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setResult({ error });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', margin: '20px' }}>
      <h3>Shelby Integration Test</h3>
      <button 
        onClick={runTest} 
        disabled={isLoading}
        className="button primary"
      >
        {isLoading ? 'Running Test...' : 'Run Integration Test'}
      </button>
      
      <div style={{ marginTop: '20px' }}>
        <p><strong>Status:</strong> {status}</p>
        
        {result && (
          <div style={{ marginTop: '20px' }}>
            <h4>Results:</h4>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '10px', 
              borderRadius: '4px',
              overflow: 'auto' 
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}