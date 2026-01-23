# Secure Pastebin Design Document

## Project Overview
A secure, static website pastebin that allows users to share encrypted files using post-quantum cryptography, with storage on Shelby.xyz decentralized network.

## Architecture

### Technology Stack
- **Frontend**: React with TypeScript
- **Build Tool**: Bun
- **Linting/Formatting**: Biome
- **Storage**: Shelby.xyz (decentralized storage)
- **Encryption**: Kyber (post-quantum) + AES-GCM
- **Key Derivation**: Argon2id from passwords

### System Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  React Static   │────▶│  Shelby.xyz API  │────▶│ Shelby Storage  │
│    Website      │     │                  │     │    Network      │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Local Browser  │
│   Encryption/   │
│  Decryption     │
└─────────────────┘
```

## Core Features

### 1. File Upload Flow
1. User selects file (up to 100MB)
2. User enters password (validated against standard rules)
3. Optional: Configure metadata encryption
4. Generate encryption key using Argon2id
5. Encrypt file using Kyber + AES-GCM
6. Upload encrypted blob to Shelby.xyz
7. Generate shareable link with file ID

### 2. File Access Flow
1. User visits link: `example.com/paste/{id}#{key-fragment}`
2. Download encrypted file from Shelby using ID
3. User enters password or uses fragment key
4. Decrypt file locally in browser
5. Display/download decrypted content

### 3. Security Implementation

#### Encryption Scheme
```typescript
interface EncryptionParams {
  algorithm: 'Kyber768' | 'Kyber1024';
  symmetric: 'AES-256-GCM';
  keyDerivation: 'Argon2id';
  saltLength: 32; // bytes
  iterations: 3;
  memory: 64 * 1024; // 64MB
  parallelism: 1;
}
```

#### Password Requirements
- Minimum 12 characters
- At least 1 uppercase, 1 lowercase, 1 number, 1 special character
- No common passwords (check against list)
- Entropy check (minimum 60 bits)

### 4. Metadata Handling

```typescript
interface FileMetadata {
  name: string;
  size: number;
  mimeType: string;
  uploadDate: number;
  expirationDate?: number;
  encryptionConfig: {
    encryptMetadata: boolean;
    algorithm: string;
  };
}
```

### 5. URL Structure
- Upload result: `https://pastebin.example.com/p/{shelby-id}#{derived-key}`
- The fragment (#) ensures the key is never sent to the server
- ID encodes the Shelby storage location

## Implementation Plan

### Phase 1: Core Infrastructure
1. Set up React + TypeScript project with Bun
2. Configure Biome for linting/formatting
3. Implement Shelby.xyz SDK integration
4. Create basic routing structure

### Phase 2: Encryption Layer
1. Integrate Kyber post-quantum library
2. Implement AES-GCM symmetric encryption
3. Add Argon2id key derivation
4. Create encryption/decryption utilities

### Phase 3: Upload Feature
1. Create file upload UI component
2. Implement password validation
3. Add metadata configuration options
4. Build encryption pipeline
5. Integrate Shelby upload API

### Phase 4: Access Feature
1. Create file access page
2. Implement URL parsing for ID/key
3. Build decryption pipeline
4. Add download functionality

### Phase 5: User Experience
1. Add progress indicators
2. Implement error handling
3. Create expiration management
4. Add copy-to-clipboard for links

### Phase 6: Security & Testing
1. Security audit of encryption implementation
2. Unit tests for all crypto functions
3. E2E tests on localnet
4. Performance optimization

## Security Considerations

1. **Client-Side Only**: All encryption/decryption happens in the browser
2. **No Server Access**: Static site cannot access passwords or keys
3. **Post-Quantum**: Resistant to quantum computer attacks
4. **Forward Secrecy**: Each file uses unique encryption keys
5. **Memory Protection**: Clear sensitive data from memory after use

## Trade-offs & Decisions

1. **Fragment vs Query Parameter**: Using fragment (#) prevents key from being sent to server in HTTP requests
2. **Password-Based vs Raw Keys**: Password-based is more user-friendly but requires strong password policy
3. **Metadata Encryption**: Optional to balance between usability and privacy
4. **24-hour Link Validity**: Balances security with usability
5. **100MB Limit**: Reasonable for text/code snippets while managing costs

## Dependencies

### NPM Packages
- `@shelby-protocol/sdk` - Shelby storage integration
- `kyber-crystals` or similar - Post-quantum encryption
- `noble-ciphers` - AES-GCM implementation
- `argon2-browser` - Key derivation
- `react`, `react-router-dom` - UI framework
- Development: `typescript`, `@biomejs/biome`, `bun`

## Next Steps

1. Validate Shelby.xyz API capabilities and limits
2. Choose specific Kyber implementation library
3. Design UI mockups
4. Set up development environment
5. Begin Phase 1 implementation