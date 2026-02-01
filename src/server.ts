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

/**
 * Security headers configuration
 * These are applied to all responses for defense-in-depth
 */
const SECURITY_HEADERS: Record<string, string> = {
  // Content Security Policy - controls which resources can be loaded
  // More effective than meta tag CSP as it applies before any content loads
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://*.shelby.xyz https://api.shelby.xyz",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'", // Only works via HTTP header, not meta tag!
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; '),

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

  // Prevent caching of sensitive data
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
}

/**
 * Custom handler that adds security headers to all responses
 */
const securityHeadersHandler = defineHandlerCallback(async (ctx) => {
  // Get the response from the default handler
  const response = await defaultStreamHandler(ctx)

  // Clone headers from original response
  const headers = new Headers(response.headers)

  // Add security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value)
  }

  // Return new response with security headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
})

const fetch = createStartHandler(securityHeadersHandler)

export default createServerEntry({
  fetch,
})
