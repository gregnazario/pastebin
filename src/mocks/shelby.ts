/**
 * Mock Shelby service for testing
 */

const mockStorage = new Map<string, Uint8Array>();

export const ShelbyService = {
  uploadFile: async (data: Uint8Array): Promise<string> => {
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate a mock file ID
    const fileId = `mock-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store the data
    mockStorage.set(fileId, data);

    return fileId;
  },

  downloadFile: async (fileId: string): Promise<Uint8Array> => {
    // Simulate download delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const data = mockStorage.get(fileId);
    if (!data) {
      throw new Error(`File not found: ${fileId}`);
    }

    return data;
  },

  deleteFile: async (fileId: string): Promise<void> => {
    mockStorage.delete(fileId);
  },
};
