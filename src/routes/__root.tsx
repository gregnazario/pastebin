import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router'
import '../styles.css'

// Site metadata
const SITE_TITLE = 'Secure Pastebin - Post-Quantum Encrypted File Sharing'
const SITE_DESCRIPTION = 'Share files securely with post-quantum encryption. Uses ML-KEM (Kyber) + AES-256-GCM hybrid encryption to protect against future quantum attacks.'
const SITE_URL = 'https://pastebin.example.com' // Update with actual domain

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: SITE_TITLE },
      { name: 'description', content: SITE_DESCRIPTION },
      
      // Open Graph / Facebook
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: SITE_URL },
      { property: 'og:title', content: SITE_TITLE },
      { property: 'og:description', content: SITE_DESCRIPTION },
      { property: 'og:image', content: `${SITE_URL}/og-image.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: 'Secure Pastebin - Post-quantum encrypted file sharing with ML-KEM, AES-256-GCM, and Argon2id' },
      { property: 'og:site_name', content: 'Secure Pastebin' },
      { property: 'og:locale', content: 'en_US' },
      
      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:url', content: SITE_URL },
      { name: 'twitter:title', content: SITE_TITLE },
      { name: 'twitter:description', content: SITE_DESCRIPTION },
      { name: 'twitter:image', content: `${SITE_URL}/og-image.png` },
      { name: 'twitter:image:alt', content: 'Secure Pastebin - Post-quantum encrypted file sharing' },
      
      // Additional SEO
      { name: 'author', content: 'Secure Pastebin' },
      { name: 'keywords', content: 'pastebin, encryption, post-quantum, kyber, ml-kem, aes-256, secure file sharing, privacy, argon2' },
      { name: 'robots', content: 'index, follow' },
      { name: 'theme-color', content: '#2c3e50' },
      
      // NOTE: Security headers (CSP, X-Frame-Options, HSTS, etc.) are now set via
      // HTTP response headers in src/server.ts for better security.
      // HTTP headers are more secure than meta tags because:
      // 1. They apply before any content loads (prevents race conditions)
      // 2. frame-ancestors directive only works in HTTP headers
      // 3. Harder for attackers to inject/bypass
    ],
    links: [
      // Favicons - SVG preferred, ICO fallback
      { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      // Apple touch icon for iOS
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      // PWA manifest
      { rel: 'manifest', href: '/manifest.json' },
      // Preconnect to Shelby API for faster uploads/downloads
      { rel: 'preconnect', href: 'https://api.shelby.xyz' },
      { rel: 'dns-prefetch', href: 'https://api.shelby.xyz' },
    ],
  }),
  component: RootLayout,
})

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="app-header">
          <div className="header-content">
            <Link to="/" className="logo">
              🔐 Secure Pastebin
            </Link>
            <nav>
              <Link to="/">Home</Link>
              <Link to="/upload">Upload</Link>
            </nav>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
        <Scripts />
      </body>
    </html>
  )
}
