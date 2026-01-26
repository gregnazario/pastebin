# Secure Pastebin 🔐

A modern, secure file sharing application with post-quantum encryption. Share files safely with end-to-end encryption using Kyber (ML-KEM-768) and AES-256-GCM.

## Features

### 🛡️ Security
- **Post-Quantum Encryption**: Kyber-768 (ML-KEM) for quantum-resistant key exchange
- **Strong Symmetric Encryption**: AES-256-GCM for file encryption
- **Password-Based Key Derivation**: Argon2id (or PBKDF2 fallback in browser)
- **Client-Side Only**: All encryption happens in your browser
- **Zero Knowledge**: Server never sees unencrypted data or passwords

### 📁 File Handling
- Support for files up to 100MB
- Any file type supported (text, images, documents, etc.)
- Automatic MIME type detection
- Optional metadata encryption

### 🔗 Sharing
- Shareable links with private key in URL fragment (never sent to server)
- 24-hour link expiration
- One-click link copying
- Password required for decryption

### 🚀 Performance
- Optimized encryption pipeline
- Progress tracking for large files
- Streaming support for efficient memory usage

## Quick Start

### Prerequisites
- [Bun](https://bun.sh/) (v1.0+)
- Node.js 20+ (for some dependencies)
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+)

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/pastebin.git
cd pastebin

# Install dependencies
bun install

# Start development server
bun dev
```

The app will be available at http://localhost:3000

### Building for Production
```bash
# Build the application
bun run build

# Preview production build
bun run preview
```

## Usage

### Uploading a File
1. Click "Upload a File" on the homepage
2. Select your file (max 100MB)
3. Enter a strong password
4. Optionally enable metadata encryption
5. Click "Encrypt and Upload"
6. Copy the generated link to share

### Downloading a File
1. Open the shared link
2. Enter the password used for encryption
3. Click "Download and Decrypt"
4. File will be decrypted and downloaded automatically

## Testing

### Unit Tests
```bash
# Run unit tests
bun test

# Run with coverage
bun test:coverage
```

### End-to-End Tests
```bash
# Install Playwright browsers
bunx playwright install

# Run E2E tests
bun test:e2e

# Run E2E tests with UI
bun test:e2e:ui
```

### Performance Benchmarks
Visit `/benchmark` in development mode to run performance tests and file type compatibility tests.

## Architecture

### Tech Stack
- **Frontend**: React 18 with TypeScript
- **Routing**: React Router v6
- **Build Tool**: Vite with Bun
- **Styling**: CSS with modern features
- **Cryptography**: @noble/post-quantum, @noble/ciphers
- **Testing**: Vitest (unit), Playwright (E2E)

### Project Structure
```
src/
├── components/        # Reusable React components
├── pages/            # Page components
├── services/         # Business logic
│   ├── crypto/      # Encryption services
│   ├── storage/     # File storage (Shelby.xyz)
│   └── validation/  # Input validation
├── types/           # TypeScript types
├── utils/           # Utility functions
├── benchmarks/      # Performance tests
└── test/           # Test utilities
```

### Security Architecture
1. **Key Generation**: Kyber-768 keypair generated client-side
2. **Key Derivation**: Password → Argon2id → 256-bit key
3. **Hybrid Encryption**: 
   - Kyber for key encapsulation
   - AES-256-GCM for data encryption
   - Keys combined for defense in depth
4. **Link Generation**: Private key encoded in URL fragment

## Development

### Available Scripts
- `bun dev` - Start development server
- `bun build` - Build for production
- `bun test` - Run unit tests
- `bun test:e2e` - Run E2E tests
- `bun lint` - Check code style
- `bun format` - Format code
- `bun typecheck` - Type checking

### Environment Variables
Create a `.env` file for configuration:
```env
# Shelby.xyz API endpoint
VITE_SHELBY_API_URL=https://api.shelby.xyz

# File constraints
VITE_MAX_FILE_SIZE=104857600  # 100MB in bytes
VITE_LINK_EXPIRY_HOURS=24
```

## Browser Support

### Desktop
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### Mobile
- iOS Safari 14+
- Chrome Android
- Firefox Android

See [Browser Compatibility](docs/browser-compatibility.md) for detailed information.

## Known Limitations

1. **Development Mode**: Uses mocked crypto implementations for easier testing
2. **File Size**: Limited to 100MB due to browser constraints
3. **Argon2**: Falls back to PBKDF2 in browser (WASM issues)
4. **Storage**: Currently using mocked storage, requires Shelby.xyz integration

## Security Considerations

- Always use HTTPS in production (required for Web Crypto API)
- Private keys in URL fragments are never sent to the server
- Implement proper CSP headers
- Consider rate limiting for uploads
- Regular security audits recommended

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run `bun test` and `bun lint`
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- [Noble Cryptography](https://paulmillr.com/noble/) for excellent crypto libraries
- [Shelby Protocol](https://shelby.xyz) for decentralized storage
- Post-quantum cryptography community for Kyber implementation