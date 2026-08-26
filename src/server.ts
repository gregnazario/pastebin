/**
 * TanStack Start Server Entry Point
 * Adds security headers to all responses via HTTP headers (more secure than meta tags)
 */

import {
  createStartHandler,
  defaultStreamHandler,
  defineHandlerCallback,
} from '@tanstack/react-start/server'
import { createServerEntry } from '@tanstack/react-start/server-entry'
import { handleApiV1Request } from './server/apiV1'

/**
 * Security headers configuration
 * These are applied to all responses for defense-in-depth
 */

/**
 * Detect if we're running in development mode
 * Uses multiple methods for reliability across different environments
 */
function detectDevMode(): boolean {
  // Check build-time constant (if available)
  try {
    // @ts-expect-error - __BUILD_MODE__ is defined at build time
    if (typeof __BUILD_MODE__ !== 'undefined') {
      // @ts-expect-error - __BUILD_MODE__ is defined at build time
      return __BUILD_MODE__ === 'development'
    }
  } catch {
    // Constant not available
  }

  // Fallback to NODE_ENV
  return process.env.NODE_ENV !== 'production'
}

const isDev = detectDevMode()

/**
 * Build CSP based on environment
 *
 * NOTE: TanStack Start and React SSR require inline scripts for hydration.
 * We use 'unsafe-inline' for scripts to support this. For maximum security,
 * a nonce-based approach would be needed, but that requires framework support.
 *
 * In development, we also allow eval and WebSocket for Vite HMR.
 */
function buildCSP(devMode: boolean): string {
  // Base script-src allows inline scripts needed for React hydration
  // In production, this is the minimum required for SSR frameworks
  const scriptSrc = devMode
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'"

  const styleSrc = devMode ? "style-src 'self' 'unsafe-inline'" : "style-src 'self' 'unsafe-inline'"

  const connectSrc = devMode
    ? "connect-src 'self' ws://localhost:* http://localhost:*"
    : "connect-src 'self'"

  return [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    connectSrc,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'", // Only works via HTTP header, not meta tag!
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ')
}

const SECURITY_HEADERS: Record<string, string> = {
  // Content Security Policy - controls which resources can be loaded
  // More effective than meta tag CSP as it applies before any content loads
  'Content-Security-Policy': buildCSP(isDev),

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Clickjacking protection (backup for frame-ancestors)
  'X-Frame-Options': 'DENY',

  // XSS protection (legacy, but still useful for older browsers)
  'X-XSS-Protection': '1; mode=block',

  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // HTTP Strict Transport Security - force HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Permissions Policy - disable unnecessary browser features
  'Permissions-Policy': [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
  ].join(', '),

  // Prevent caching of HTML pages and API responses (encrypted data should not be cached)
  // Note: Static assets (JS/CSS/images) are served by the CDN/platform with proper cache headers
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
}

/**
 * Applies project-wide security headers while preserving existing response headers.
 */
function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * TanStack Start 1.168+ may return a bare Response or an SSR wrapper that
 * also carries stream cleanup. Apply security headers without dropping that
 * cleanup metadata.
 */
function withSecurityHeadersOnHandlerResult(
  result: Awaited<ReturnType<typeof defaultStreamHandler>>,
): Awaited<ReturnType<typeof defaultStreamHandler>> {
  if (result instanceof Response) {
    return withSecurityHeaders(result)
  }

  return {
    ...result,
    response: withSecurityHeaders(result.response),
  }
}

/**
 * Custom handler that renders SSR routes and applies security headers.
 */
const securityHeadersHandler = defineHandlerCallback(async (ctx) => {
  const result = await defaultStreamHandler(ctx)
  return withSecurityHeadersOnHandlerResult(result)
})

const startFetch = createStartHandler(securityHeadersHandler)

/**
 * Entry fetch wrapper that short-circuits versioned API routes before TanStack SSR routing.
 *
 * This avoids TanStack's HTML accept-header gate for non-HTML API clients while preserving
 * the existing SSR handler behavior for web routes.
 */
const fetch = async (request: Request): Promise<Response> => {
  const apiResponse = await handleApiV1Request(request)
  if (apiResponse) {
    return withSecurityHeaders(apiResponse)
  }

  return startFetch(request)
}

export default createServerEntry({
  fetch,
})
