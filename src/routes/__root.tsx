import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { LogoIcon, LockIcon, MoonIcon, SunIcon } from '../components/Icons'
import { PWAPrompt } from '../components/PWAPrompt'
import { ToastProvider } from '../components/Toast'
import '../styles.css'

// Site metadata
const SITE_TITLE = 'SecuPaste - Post-Quantum Encrypted File Sharing'
const SITE_DESCRIPTION =
  'Share files securely with post-quantum encryption. Uses ML-KEM (Kyber) + AES-256-GCM hybrid encryption to protect against future quantum attacks.'
const SITE_URL = 'https://pastebin.sed.fyi' // Update with actual domain

/**
 * JSON-LD structured data for SEO and LLM discoverability.
 * Includes WebApplication schema and Organization info.
 */
function getStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'SecuPaste',
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        applicationCategory: 'SecurityApplication',
        operatingSystem: 'Any',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [
          'Post-quantum encryption (ML-KEM-768 / Kyber)',
          'AES-256-GCM symmetric encryption',
          'Argon2id password-based key derivation',
          'Client-side encryption — server never sees plaintext',
          'Zero-knowledge ciphertext storage',
          'Zero-knowledge architecture',
          'File and text note sharing',
          'Optional metadata encryption',
        ],
        screenshot: `${SITE_URL}/og-image.png`,
        softwareVersion: '1.0',
        author: {
          '@type': 'Organization',
          name: 'SecuPaste',
          url: SITE_URL,
        },
      },
      {
        '@type': 'WebSite',
        name: 'SecuPaste',
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/docs`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What if I forget my password?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Unfortunately, if you forget your password, your file cannot be recovered. This is by design — if we could recover your file without the password, so could an attacker. We recommend using a password manager to store important passwords.',
            },
          },
          {
            '@type': 'Question',
            name: 'How long are files stored?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Files are stored for 30 days by default. After this period, the encrypted blob is deleted from object storage.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is this really secure?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, as long as you use a strong password. The encryption uses industry-standard algorithms (AES-256-GCM) combined with post-quantum protection (ML-KEM). All encryption happens in your browser — we never have access to your unencrypted data or passwords.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is post-quantum encryption?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Post-quantum encryption uses mathematical problems that quantum computers cannot solve efficiently. We use ML-KEM (Kyber), which is based on lattice problems believed to be hard for both classical and quantum computers.',
            },
          },
        ],
      },
    ],
  }
}

/**
 * Custom 404 page component for unmatched routes
 */
function NotFoundPage() {
  return (
    <div className="not-found-page">
      <h1>Page Not Found</h1>
      <p>The page you're looking for doesn't exist or may have been moved.</p>
      <div className="not-found-actions">
        <Link to="/" className="not-found-link">
          Go Home
        </Link>
        <Link to="/upload" className="not-found-link">
          Upload a File
        </Link>
        <Link to="/docs" className="not-found-link">
          Read Docs
        </Link>
      </div>
    </div>
  )
}

export const Route = createRootRoute({
  notFoundComponent: NotFoundPage,
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
      {
        property: 'og:image:alt',
        content:
          'SecuPaste - Post-quantum encrypted file sharing with ML-KEM, AES-256-GCM, and Argon2id',
      },
      { property: 'og:site_name', content: 'SecuPaste' },
      { property: 'og:locale', content: 'en_US' },

      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:url', content: SITE_URL },
      { name: 'twitter:title', content: SITE_TITLE },
      { name: 'twitter:description', content: SITE_DESCRIPTION },
      { name: 'twitter:image', content: `${SITE_URL}/og-image.png` },
      {
        name: 'twitter:image:alt',
        content: 'SecuPaste - Post-quantum encrypted file sharing',
      },

      // Additional SEO
      { name: 'author', content: 'SecuPaste' },
      {
        name: 'keywords',
        content:
          'pastebin, encryption, post-quantum, kyber, ml-kem, aes-256, secure file sharing, privacy, argon2',
      },
      { name: 'robots', content: 'index, follow' },

      // PWA & Mobile
      { name: 'theme-color', content: '#2c3e50' },
      { name: 'theme-color', content: '#1a1a2e', media: '(prefers-color-scheme: dark)' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'SecuPaste' },
      { name: 'application-name', content: 'SecuPaste' },
      { name: 'msapplication-TileColor', content: '#2c3e50' },
      { name: 'msapplication-tap-highlight', content: 'no' },
      { name: 'format-detection', content: 'telephone=no' },

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
      // Canonical URL
      { rel: 'canonical', href: SITE_URL },
    ],
  }),
  component: RootLayout,
})

/**
 * Hook to manage dark mode state with system preference detection
 * and localStorage persistence for manual override.
 */
function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean | null>(null)
  const [isManualOverride, setIsManualOverride] = useState(false)

  // Initialize on mount
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') {
      setIsDark(stored === 'dark')
      setIsManualOverride(true)
    } else {
      // Follow system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(prefersDark)
    }
  }, [])

  // Listen for system preference changes when not manually overridden
  useEffect(() => {
    if (isManualOverride) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [isManualOverride])

  // Apply theme to document
  useEffect(() => {
    if (isDark === null) return
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const newValue = !prev
      // Save to localStorage inside the updater to use the correct new value
      localStorage.setItem('theme', newValue ? 'dark' : 'light')
      return newValue
    })
    setIsManualOverride(true)
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem('theme')
    setIsManualOverride(false)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDark(prefersDark)
  }, [])

  return { isDark, toggle, reset, isManualOverride }
}

// GitHub icon SVG component
function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

// Hamburger menu icon
function HamburgerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

// Close icon for mobile menu
function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

const GITHUB_REPO_URL = 'https://github.com/gregnazario/pastebin' // Update with actual repo URL

function RootLayout() {
  const { isDark, toggle } = useDarkMode()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  // Close menu on route change
  useEffect(() => {
    closeMobileMenu()
  }, [closeMobileMenu])

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMobileMenu()
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen, closeMobileMenu])

  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* JSON-LD structured data for SEO and LLM discoverability */}
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data is safe static content
          dangerouslySetInnerHTML={{ __html: JSON.stringify(getStructuredData()) }}
        />
      </head>
      <body>
        {/* Skip navigation link for keyboard and screen reader users */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <header className="app-header">
          <div className="header-content">
            <Link to="/" className="logo" onClick={closeMobileMenu} aria-label="SecuPaste — Home">
              <LogoIcon size="1.4em" className="logo-icon" />
              SecuPaste
            </Link>

            {/* Desktop navigation */}
            <nav className="desktop-nav" aria-label="Main navigation">
              <Link to="/">Home</Link>
              <Link to="/upload">Upload</Link>
              <Link to="/docs">Docs</Link>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="github-link"
                aria-label="View source on GitHub (opens in new tab)"
                title="View source on GitHub"
              >
                <GitHubIcon />
              </a>
              <button
                type="button"
                className="theme-toggle"
                onClick={toggle}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
              </button>
            </nav>

            {/* Mobile menu button */}
            <div className="mobile-nav-controls">
              <button
                type="button"
                className="theme-toggle"
                onClick={toggle}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
              </button>
              <button
                type="button"
                className="hamburger-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-nav-menu"
              >
                {mobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
              </button>
            </div>
          </div>

          {/* Mobile navigation overlay */}
          {mobileMenuOpen && (
            <button
              type="button"
              className="mobile-nav-overlay"
              onClick={closeMobileMenu}
              aria-label="Close navigation menu"
              tabIndex={-1}
            />
          )}

          {/* Mobile navigation menu */}
          <nav
            id="mobile-nav-menu"
            className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}
            aria-label="Mobile navigation"
            aria-hidden={!mobileMenuOpen}
          >
            <Link to="/" onClick={closeMobileMenu}>
              Home
            </Link>
            <Link to="/upload" onClick={closeMobileMenu}>
              Upload
            </Link>
            <Link to="/docs" onClick={closeMobileMenu}>
              Docs
            </Link>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
              onClick={closeMobileMenu}
              aria-label="View source on GitHub (opens in new tab)"
            >
              <GitHubIcon />
              <span>GitHub</span>
            </a>
          </nav>
        </header>
        <ToastProvider>
          <main id="main-content" tabIndex={-1}>
            <Outlet />
          </main>
        </ToastProvider>
        <footer className="app-footer">
          <div className="footer-content">
            <nav className="footer-links" aria-label="Footer navigation">
              <Link to="/">Home</Link>
              <Link to="/upload">Upload</Link>
              <Link to="/docs">How It Works</Link>
            </nav>
            <p className="footer-tagline">
              <LockIcon size="1em" className="footer-icon" aria-hidden /> Built with post-quantum encryption
            </p>
            <p className="footer-copyright">Protected by ML-KEM + AES-256-GCM</p>
          </div>
        </footer>
        <PWAPrompt />
        <Scripts />
      </body>
    </html>
  )
}
