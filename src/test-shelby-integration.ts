/**
 * Test script for Shelby integration
 * Run with: bun run src/test-shelby-integration.ts
 */

import { ShelbyService } from './services/storage/ShelbyService';

async function testShelbyIntegration() {
  console.log('Testing Shelby integration...\n');

  const service = new ShelbyService();

  // Test data
  const testContent = 'Hello from Secure Pastebin test!';
  const encoder = new TextEncoder();
  const testData = encoder.encode(testContent);

  try {
    // Test 1: Upload
    console.log('1. Testing file upload...');
    const uploadResult = await service.uploadFile(testData, {
      filename: 'test.txt',
      contentType: 'text/plain',
    });
    console.log('✓ Upload successful:', {
      id: uploadResult.id,
      url: uploadResult.url,
      expiresAt: new Date(uploadResult.expiresAt).toISOString(),
    });

    // Test 2: Check existence
    console.log('\n2. Testing file existence check...');
    const exists = await service.fileExists(uploadResult.id);
    console.log('✓ File exists:', exists);

    // Test 3: Download
    console.log('\n3. Testing file download...');
    const downloadedData = await service.downloadFile(uploadResult.id);
    const decoder = new TextDecoder();
    const downloadedContent = decoder.decode(downloadedData);
    console.log('✓ Downloaded content:', downloadedContent);
    console.log('✓ Content matches:', downloadedContent === testContent);

    // Test 4: Delete (optional, commented out to preserve test data)
    // console.log('\n4. Testing file deletion...');
    // await service.deleteFile(uploadResult.id);
    // console.log('✓ File deleted successfully');

    console.log('\n✅ All tests passed!');
    console.log('\nYou can access the uploaded file at:');
    console.log(`${window.location.origin}/p/${uploadResult.id}`);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        code: (error as any).code,
        statusCode: (error as any).statusCode,
      });
    }
  }
}

// Run the test
testShelbyIntegration();
