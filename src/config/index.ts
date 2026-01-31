export const config = {
  shelby: {
    apiUrl: import.meta.env.VITE_SHELBY_API_URL || 'https://api.shelbynet.shelby.xyz/shelby',
    apiKey: import.meta.env.VITE_SHELBY_API_KEY,
    network: import.meta.env.VITE_SHELBY_NETWORK || 'shelbynet',
  },
  app: {
    maxFileSize: Number(import.meta.env.VITE_MAX_FILE_SIZE) || 104857600, // 100MB
    linkExpiryHours: Number(import.meta.env.VITE_LINK_EXPIRY_HOURS) || 24,
  },
} as const;
