/**
 * Server functions for encrypted paste upload/download.
 *
 * Security notes:
 * - CSRF: this API is stateless and does not use session cookies.
 * - Rate limiting: in-memory per IP. Use Redis if running multiple instances.
 * - Input validation: filenames and blob IDs are sanitized before persistence.
 * - Encryption: clients encrypt before upload; this module stores ciphertext only.
 */

import { createServerFn } from '@tanstack/react-start'
import { type BlobStore, createBlobStoreFromEnv } from './storage'

// ============================================================================
// Constants
// ============================================================================

/** API version exposed by `/api/v1/*` endpoints. */
export const API_V1_VERSION = '1.1.0'

/** Maximum upload size in bytes (100MB) */
export const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024

/** Maximum filename length */
export const MAX_FILENAME_LENGTH = 255

/** Rate limit window in milliseconds (1 hour) */
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

/** Maximum uploads per IP per window */
export const MAX_UPLOADS_PER_WINDOW = 50

/** Maximum downloads per IP per window */
export const MAX_DOWNLOADS_PER_WINDOW = 200

// ============================================================================
// Rate Limiting (Simple in-memory implementation)
// ============================================================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

const uploadRateLimits = new Map<string, RateLimitEntry>()
const downloadRateLimits = new Map<string, RateLimitEntry>()

/**
 * Extract client IP from request headers.
 * Supports X-Forwarded-For, X-Real-IP, and CF-Connecting-IP.
 */
function getClientIp(headers: Headers | Record<string, string | undefined>): string {
  const getHeader = (name: string): string | undefined => {
    if (headers instanceof Headers) {
      return headers.get(name) || undefined
    }
    return headers[name]
  }

  const forwardedFor = getHeader('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim()
    if (firstIp && isValidIpAddress(firstIp)) {
      return firstIp
    }
  }

  const realIp = getHeader('x-real-ip')
  if (realIp && isValidIpAddress(realIp)) {
    return realIp
  }

  const cfIp = getHeader('cf-connecting-ip')
  if (cfIp && isValidIpAddress(cfIp)) {
    return cfIp
  }

  return 'unknown'
}

/**
 * Validate IP address format (basic validation).
 */
function isValidIpAddress(ip: string): boolean {
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Pattern =
    /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^([0-9a-fA-F]{1,4}:)*:([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/

  if (ipv4Pattern.test(ip)) {
    const octets = ip.split('.').map(Number)
    return octets.every((o) => o >= 0 && o <= 255)
  }

  return ipv6Pattern.test(ip)
}

/**
 * Check and update rate limit for an operation.
 */
function isRateLimited(
  limits: Map<string, RateLimitEntry>,
  key: string,
  maxRequests: number,
): boolean {
  const now = Date.now()
  const entry = limits.get(key)

  if (!entry || now > entry.resetAt) {
    limits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (entry.count >= maxRequests) {
    return true
  }

  entry.count++
  return false
}

setInterval(
  () => {
    const now = Date.now()
    for (const [key, entry] of uploadRateLimits) {
      if (now > entry.resetAt) uploadRateLimits.delete(key)
    }
    for (const [key, entry] of downloadRateLimits) {
      if (now > entry.resetAt) downloadRateLimits.delete(key)
    }
  },
  10 * 60 * 1000,
)

// ============================================================================
// Input Validation Utilities
// ============================================================================

/**
 * Sanitize filename to prevent path traversal and injection attacks.
 */
function sanitizeFilename(filename: string): string {
  const basename = filename.split(/[/\\]/).pop() || 'file'
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return sanitized.slice(0, 100)
}

/**
 * Validate file ID format: pastebin-timestamp-sanitized_filename[-suffix]
 */
function isValidFileId(id: string): boolean {
  const pattern = /^pastebin-\d+-[\w._-]+$/
  return pattern.test(id) && id.length <= 500
}

// ============================================================================
// Logging Utilities
// ============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Structured logging helper. Avoids writing ciphertext or secrets.
 */
function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  }

  if (process.env.NODE_ENV === 'production') {
    if (level === 'error') {
      console.error(JSON.stringify(logEntry))
    } else {
      console.log(JSON.stringify(logEntry))
    }
  } else {
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [Blobs]`
    if (level === 'error') {
      console.error(prefix, message, meta || '')
    } else if (level === 'warn') {
      console.warn(prefix, message, meta || '')
    } else {
      console.log(prefix, message, meta || '')
    }
  }
}

// ============================================================================
// Configuration
// ============================================================================

interface ServerConfig {
  defaultExpirationDays: number
}

/** Validated upload request payload */
export interface UploadBlobRequest {
  data: number[]
  filename: string
}

/** Validated download request payload */
export interface DownloadBlobRequest {
  id: string
}

/** Health response payload for native and web clients */
export interface StorageHealthResponse {
  configured: boolean
  account: string | null
}

/** Capabilities response for `/api/v1/capabilities`. */
export interface StorageCapabilitiesResponse {
  apiVersion: string
  maxUploadBytes: number
  maxFilenameLength: number
  rateLimitWindowMs: number
  maxUploadsPerWindow: number
  maxDownloadsPerWindow: number
}

let validatedConfig: ServerConfig | null = null
let blobStore: BlobStore | null = null

/**
 * Validate and get server configuration.
 */
function getConfig(): ServerConfig {
  if (validatedConfig) {
    return validatedConfig
  }

  const expirationDaysStr = process.env.DEFAULT_EXPIRATION_DAYS || '30'
  const expirationDays = Number.parseInt(expirationDaysStr, 10)
  if (Number.isNaN(expirationDays) || expirationDays < 1 || expirationDays > 365) {
    log('error', 'Configuration error: DEFAULT_EXPIRATION_DAYS must be between 1 and 365')
    throw new Error('Service configuration error')
  }

  validatedConfig = {
    defaultExpirationDays: expirationDays,
  }

  return validatedConfig
}

/**
 * Lazy blob-store singleton. Reset in tests via resetServerStateForTests().
 */
function getStore(): BlobStore {
  if (!blobStore) {
    blobStore = createBlobStoreFromEnv()
  }
  return blobStore
}

/**
 * Reset cached config, store, and rate-limit maps. Test-only.
 */
export function resetServerStateForTests(): void {
  validatedConfig = null
  blobStore = null
  uploadRateLimits.clear()
  downloadRateLimits.clear()
}

/**
 * Extract request headers from TanStack context safely.
 */
function extractRequestHeaders(
  context: unknown,
): Headers | Record<string, string | undefined> | undefined {
  if (!context || typeof context !== 'object') {
    return undefined
  }

  const ctx = context as { request?: { headers?: Headers | Record<string, string | undefined> } }
  return ctx.request?.headers
}

/**
 * Validate upload input payload.
 */
export function validateUploadBlobRequest(d: unknown): UploadBlobRequest {
  if (!d || typeof d !== 'object') {
    throw new Error('Invalid request format')
  }

  const input = d as { data?: unknown; filename?: unknown }

  if (!Array.isArray(input.data)) {
    throw new Error('Invalid request: data must be an array')
  }

  if (input.data.length === 0) {
    throw new Error('Invalid request: data cannot be empty')
  }

  if (input.data.length > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error(`Invalid request: data exceeds maximum size of ${MAX_UPLOAD_SIZE_BYTES} bytes`)
  }

  if (!input.data.every((n) => typeof n === 'number' && n >= 0 && n <= 255)) {
    throw new Error('Invalid request: data must contain valid byte values')
  }

  if (typeof input.filename !== 'string') {
    throw new Error('Invalid request: filename must be a string')
  }

  if (input.filename.length === 0) {
    throw new Error('Invalid request: filename cannot be empty')
  }

  if (input.filename.length > MAX_FILENAME_LENGTH) {
    throw new Error(`Invalid request: filename exceeds maximum length of ${MAX_FILENAME_LENGTH}`)
  }

  return { data: input.data as number[], filename: input.filename }
}

/**
 * Validate download input payload.
 */
export function validateDownloadBlobRequest(d: unknown): DownloadBlobRequest {
  if (!d || typeof d !== 'object') {
    throw new Error('Invalid request format')
  }

  const input = d as { id?: unknown }

  if (typeof input.id !== 'string') {
    throw new Error('Invalid request: id must be a string')
  }

  if (input.id.length === 0) {
    throw new Error('Invalid request: id cannot be empty')
  }

  if (!isValidFileId(input.id)) {
    throw new Error('Invalid request: malformed file ID')
  }

  return { id: input.id }
}

/**
 * Internal upload implementation shared by server functions and REST APIs.
 */
export async function uploadBlobInternal(
  input: UploadBlobRequest,
  requestHeaders?: Headers | Record<string, string | undefined>,
): Promise<{ id: string; expiresAt: number }> {
  const clientId = requestHeaders ? getClientIp(requestHeaders) : 'unknown'

  if (isRateLimited(uploadRateLimits, clientId, MAX_UPLOADS_PER_WINDOW)) {
    log('warn', 'Rate limit exceeded for upload', { clientId })
    throw new Error('Too many requests. Please try again later.')
  }

  const store = getStore()
  const config = getConfig()
  const data = new Uint8Array(input.data)
  const sanitizedFilename = sanitizeFilename(input.filename)
  const randomSuffix = crypto.randomUUID().split('-')[0]
  const blobName = `pastebin-${Date.now()}-${sanitizedFilename}-${randomSuffix}`
  const expiresAt = Date.now() + config.defaultExpirationDays * 24 * 60 * 60 * 1000

  log('info', 'Starting upload', { filename: sanitizedFilename, size: data.length, store: store.kind })

  await store.put(blobName, data, {
    expiresAt,
    filename: sanitizedFilename,
    storedAt: Date.now(),
  })

  log('info', 'Upload complete', { blobName, store: store.kind })

  return {
    id: blobName,
    expiresAt,
  }
}

/**
 * Internal download implementation shared by server functions and REST APIs.
 */
export async function downloadBlobInternal(
  input: DownloadBlobRequest,
  requestHeaders?: Headers | Record<string, string | undefined>,
): Promise<{ data: number[] }> {
  const clientId = requestHeaders ? getClientIp(requestHeaders) : 'unknown'

  if (isRateLimited(downloadRateLimits, clientId, MAX_DOWNLOADS_PER_WINDOW)) {
    log('warn', 'Rate limit exceeded for download', { clientId })
    throw new Error('Too many requests. Please try again later.')
  }

  const store = getStore()
  log('info', 'Starting download', { id: input.id, store: store.kind })

  const stored = await store.get(input.id)
  if (!stored) {
    log('warn', 'Blob not found', { id: input.id })
    throw new Error('File not found')
  }

  log('info', 'Download complete', { id: input.id, size: stored.data.length })

  return {
    data: Array.from(stored.data),
  }
}

/**
 * Internal health check implementation shared by server functions and REST APIs.
 */
export async function checkHealthInternal(): Promise<StorageHealthResponse> {
  try {
    const store = getStore()
    return {
      configured: true,
      account: store.account,
    }
  } catch {
    return {
      configured: false,
      account: null,
    }
  }
}

/**
 * Internal capabilities response shared by REST and potential future server functions.
 */
export function getCapabilitiesInternal(): StorageCapabilitiesResponse {
  return {
    apiVersion: API_V1_VERSION,
    maxUploadBytes: MAX_UPLOAD_SIZE_BYTES,
    maxFilenameLength: MAX_FILENAME_LENGTH,
    rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
    maxUploadsPerWindow: MAX_UPLOADS_PER_WINDOW,
    maxDownloadsPerWindow: MAX_DOWNLOADS_PER_WINDOW,
  }
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Upload encrypted data to the configured blob store.
 */
export const uploadBlob = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => validateUploadBlobRequest(d))
  .handler(async ({ data: input, context }) => {
    return uploadBlobInternal(input, extractRequestHeaders(context))
  })

/**
 * Download encrypted data from the configured blob store.
 */
export const downloadBlob = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => validateDownloadBlobRequest(d))
  .handler(async ({ data: input, context }) => {
    return downloadBlobInternal(input, extractRequestHeaders(context))
  })

/**
 * Check server health and storage configuration.
 */
export const checkHealth = createServerFn({ method: 'GET' }).handler(async () => {
  return checkHealthInternal()
})
