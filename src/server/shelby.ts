/**
 * Shelby server functions
 * These run on the server and handle all Shelby protocol interactions
 *
 * Security Notes:
 * - CSRF Protection: This API is stateless and uses server functions with
 *   TanStack Start. No session cookies are used for authentication, so
 *   traditional CSRF attacks are not applicable. If stateful authentication
 *   is added in the future, implement CSRF tokens or use SameSite=Strict cookies.
 * - Rate Limiting: Implemented per-operation (upload/download) with in-memory
 *   storage. For production with multiple instances, use Redis or similar.
 * - Input Validation: All inputs are validated and sanitized before use.
 */

import {
  Account,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
  PrivateKey,
  PrivateKeyVariants,
} from '@aptos-labs/ts-sdk'
import {
  createDefaultErasureCodingProvider,
  expectedTotalChunksets,
  generateCommitments,
  ShelbyBlobClient,
  ShelbyNodeClient,
} from '@shelby-protocol/sdk/node'
import { createServerFn } from '@tanstack/react-start'

// ============================================================================
// Constants
// ============================================================================

/** Maximum upload size in bytes (100MB) */
const MAX_UPLOAD_SIZE = 100 * 1024 * 1024

/** Maximum filename length */
const MAX_FILENAME_LENGTH = 255

/** Rate limit window in milliseconds (1 hour) */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

/** Maximum uploads per IP per window */
const MAX_UPLOADS_PER_WINDOW = 50

/** Maximum downloads per IP per window */
const MAX_DOWNLOADS_PER_WINDOW = 200

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
 * Extract client IP from request headers
 * Supports common proxy headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP)
 * @param headers - Request headers object or Headers instance
 * @returns Client IP address or 'unknown'
 */
function getClientIp(headers: Headers | Record<string, string | undefined>): string {
  // Helper to get header value
  const getHeader = (name: string): string | undefined => {
    if (headers instanceof Headers) {
      return headers.get(name) || undefined
    }
    return headers[name]
  }

  // Check X-Forwarded-For (standard proxy header)
  const forwardedFor = getHeader('x-forwarded-for')
  if (forwardedFor) {
    // Take the first IP (original client), trim whitespace
    const firstIp = forwardedFor.split(',')[0].trim()
    if (firstIp && isValidIpAddress(firstIp)) {
      return firstIp
    }
  }

  // Check X-Real-IP (nginx)
  const realIp = getHeader('x-real-ip')
  if (realIp && isValidIpAddress(realIp)) {
    return realIp
  }

  // Check CF-Connecting-IP (Cloudflare)
  const cfIp = getHeader('cf-connecting-ip')
  if (cfIp && isValidIpAddress(cfIp)) {
    return cfIp
  }

  // Fallback
  return 'unknown'
}

/**
 * Validate IP address format (basic validation)
 */
function isValidIpAddress(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^([0-9a-fA-F]{1,4}:)*:([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/

  if (ipv4Pattern.test(ip)) {
    // Validate each octet is <= 255
    const octets = ip.split('.').map(Number)
    return octets.every((o) => o >= 0 && o <= 255)
  }

  return ipv6Pattern.test(ip)
}

/**
 * Check and update rate limit for an operation
 * @param limits - The rate limit map to use
 * @param key - The key to rate limit (e.g., IP address)
 * @param maxRequests - Maximum requests allowed in the window
 * @returns true if rate limit exceeded
 */
function isRateLimited(
  limits: Map<string, RateLimitEntry>,
  key: string,
  maxRequests: number,
): boolean {
  const now = Date.now()
  const entry = limits.get(key)

  if (!entry || now > entry.resetAt) {
    // Reset or create new entry
    limits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (entry.count >= maxRequests) {
    return true
  }

  entry.count++
  return false
}

// Clean up old rate limit entries periodically (every 10 minutes)
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
 * Sanitize filename to prevent path traversal and injection attacks
 * @param filename - The raw filename
 * @returns Sanitized filename
 */
function sanitizeFilename(filename: string): string {
  // Remove path components (handle both Unix and Windows paths)
  const basename = filename.split(/[/\\]/).pop() || 'file'
  // Remove dangerous characters, keep only alphanumeric, dots, dashes, underscores
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_')
  // Limit length
  return sanitized.slice(0, 100)
}

/**
 * Validate file ID format
 * @param id - The file ID to validate
 * @returns true if valid
 */
function isValidFileId(id: string): boolean {
  // File IDs should match pattern: pastebin-timestamp-sanitized_filename
  // Allow alphanumeric, dashes, underscores, dots
  const pattern = /^pastebin-\d+-[\w._-]+$/
  return pattern.test(id) && id.length <= 500
}

// ============================================================================
// Logging Utilities
// ============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Structured logging function
 * In production, this would integrate with a proper logging service
 */
function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  }

  // In production, send to logging service instead of console
  if (process.env.NODE_ENV === 'production') {
    // Would send to logging service (e.g., DataDog, CloudWatch, etc.)
    // For now, use JSON format for production logs
    if (level === 'error') {
      console.error(JSON.stringify(logEntry))
    } else {
      console.log(JSON.stringify(logEntry))
    }
  } else {
    // Development: use readable format
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [Shelby]`
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
  apiKey: string
  privateKey: string
  defaultExpirationDays: number
}

let validatedConfig: ServerConfig | null = null

/**
 * Validate and get server configuration
 * Throws on first call if configuration is invalid
 */
function getConfig(): ServerConfig {
  if (validatedConfig) {
    return validatedConfig
  }

  const apiKey = process.env.SHELBY_API_KEY
  const privateKey = process.env.SHELBY_PRIVATE_KEY
  const expirationDaysStr = process.env.DEFAULT_EXPIRATION_DAYS || '30'

  // Validate API key
  if (!apiKey || apiKey.length < 10) {
    log('error', 'Configuration error: SHELBY_API_KEY is missing or invalid')
    throw new Error('Service configuration error')
  }

  // Validate private key format
  if (!privateKey || (!privateKey.startsWith('0x') && privateKey.length < 64)) {
    log('error', 'Configuration error: SHELBY_PRIVATE_KEY is missing or invalid')
    throw new Error('Service configuration error')
  }

  // Validate expiration days
  const expirationDays = Number.parseInt(expirationDaysStr, 10)
  if (Number.isNaN(expirationDays) || expirationDays < 1 || expirationDays > 365) {
    log('error', 'Configuration error: DEFAULT_EXPIRATION_DAYS must be between 1 and 365')
    throw new Error('Service configuration error')
  }

  validatedConfig = {
    apiKey,
    privateKey,
    defaultExpirationDays: expirationDays,
  }

  return validatedConfig
}

// ============================================================================
// Client Management
// ============================================================================

// Singleton client instance
let shelbyClient: ShelbyNodeClient | null = null
let aptosClient: Aptos | null = null
let serviceAccount: Account | null = null

function getClients() {
  const config = getConfig()

  if (!shelbyClient) {
    shelbyClient = new ShelbyNodeClient({
      network: Network.SHELBYNET,
      apiKey: config.apiKey,
    })
  }

  if (!aptosClient) {
    aptosClient = new Aptos(
      new AptosConfig({
        network: Network.SHELBYNET,
      }),
    )
  }

  if (!serviceAccount && config.privateKey) {
    const privateKey = new Ed25519PrivateKey(
      PrivateKey.formatPrivateKey(config.privateKey, PrivateKeyVariants.Ed25519),
    )
    serviceAccount = Account.fromPrivateKey({ privateKey })
  }

  return { shelbyClient, aptosClient, serviceAccount }
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Upload encrypted data to Shelby
 */
export const uploadBlob = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => {
    // Comprehensive input validation
    if (!d || typeof d !== 'object') {
      throw new Error('Invalid request format')
    }

    const input = d as { data?: unknown; filename?: unknown }

    // Validate data array
    if (!Array.isArray(input.data)) {
      throw new Error('Invalid request: data must be an array')
    }

    if (input.data.length === 0) {
      throw new Error('Invalid request: data cannot be empty')
    }

    if (input.data.length > MAX_UPLOAD_SIZE) {
      throw new Error(`Invalid request: data exceeds maximum size of ${MAX_UPLOAD_SIZE} bytes`)
    }

    // Validate all array elements are numbers (bytes)
    if (!input.data.every((n) => typeof n === 'number' && n >= 0 && n <= 255)) {
      throw new Error('Invalid request: data must contain valid byte values')
    }

    // Validate filename
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
  })
  .handler(async ({ data: input, context }) => {
    // Rate limiting - extract client IP from request headers if available
    // Note: TanStack Start may provide request context differently depending on version
    // Fall back to 'unknown' if headers not available (still rate limits, just globally)
    let clientId = 'unknown'
    try {
      // @ts-expect-error - context.request may exist depending on TanStack Start version
      const headers = context?.request?.headers
      if (headers) {
        clientId = getClientIp(headers)
      }
    } catch {
      // Use fallback
    }

    if (isRateLimited(uploadRateLimits, clientId, MAX_UPLOADS_PER_WINDOW)) {
      log('warn', 'Rate limit exceeded for upload', { clientId })
      throw new Error('Too many requests. Please try again later.')
    }

    const { shelbyClient, aptosClient, serviceAccount } = getClients()
    const config = getConfig()

    if (!serviceAccount || !shelbyClient || !aptosClient) {
      log('error', 'Shelby clients not initialized')
      throw new Error('Service temporarily unavailable')
    }

    const data = new Uint8Array(input.data)
    const sanitizedFilename = sanitizeFilename(input.filename)

    log('info', 'Starting upload', { filename: sanitizedFilename, size: data.length })

    // Step 1: Encode and generate commitments
    const provider = await createDefaultErasureCodingProvider()
    const commitments = await generateCommitments(provider, Buffer.from(data))

    // Step 2: Register on-chain
    // Use timestamp + sanitized filename + random suffix for uniqueness
    const randomSuffix = crypto.randomUUID().split('-')[0]
    const blobName = `pastebin-${Date.now()}-${sanitizedFilename}-${randomSuffix}`
    const expirationMicros =
      (Date.now() + config.defaultExpirationDays * 24 * 60 * 60 * 1000) * 1000

    const payload = ShelbyBlobClient.createRegisterBlobPayload({
      account: serviceAccount.accountAddress,
      blobName,
      blobMerkleRoot: commitments.blob_merkle_root,
      numChunksets: expectedTotalChunksets(commitments.raw_data_size),
      expirationMicros,
      blobSize: commitments.raw_data_size,
    })

    const transaction = await aptosClient.transaction.build.simple({
      sender: serviceAccount.accountAddress,
      data: payload,
    })

    const pendingTx = await aptosClient.signAndSubmitTransaction({
      signer: serviceAccount,
      transaction,
    })

    await aptosClient.waitForTransaction({
      transactionHash: pendingTx.hash,
    })

    log('info', 'Blob registered on-chain', { txHash: pendingTx.hash, blobName })

    // Step 3: Upload to RPC
    await shelbyClient.rpc.putBlob({
      account: serviceAccount.accountAddress.toString(),
      blobName,
      blobData: data,
    })

    log('info', 'Upload complete', { blobName })

    return {
      id: blobName,
      expiresAt: Date.now() + config.defaultExpirationDays * 24 * 60 * 60 * 1000,
    }
  })

/**
 * Download encrypted data from Shelby
 */
export const downloadBlob = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => {
    // Validate input
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

    // Validate file ID format
    if (!isValidFileId(input.id)) {
      throw new Error('Invalid request: malformed file ID')
    }

    return { id: input.id }
  })
  .handler(async ({ data: input, context }) => {
    // Rate limiting - extract client IP from request headers if available
    let clientId = 'unknown'
    try {
      // @ts-expect-error - context.request may exist depending on TanStack Start version
      const headers = context?.request?.headers
      if (headers) {
        clientId = getClientIp(headers)
      }
    } catch {
      // Use fallback
    }

    if (isRateLimited(downloadRateLimits, clientId, MAX_DOWNLOADS_PER_WINDOW)) {
      log('warn', 'Rate limit exceeded for download', { clientId })
      throw new Error('Too many requests. Please try again later.')
    }

    const { shelbyClient, serviceAccount } = getClients()

    if (!serviceAccount || !shelbyClient) {
      log('error', 'Shelby clients not initialized for download')
      throw new Error('Service temporarily unavailable')
    }

    log('info', 'Starting download', { id: input.id })

    const result = await shelbyClient.rpc.getBlob({
      account: serviceAccount.accountAddress.toString(),
      blobName: input.id,
    })

    if (!result?.readable) {
      log('warn', 'Blob not found', { id: input.id })
      throw new Error('File not found')
    }

    // Read stream into buffer
    const reader = result.readable.getReader()
    const chunks: Uint8Array[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const data = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      data.set(chunk, offset)
      offset += chunk.length
    }

    log('info', 'Download complete', { id: input.id, size: totalLength })

    // Return as array of numbers (serializable)
    return {
      data: Array.from(data),
    }
  })

/**
 * Check server health and Shelby configuration
 */
export const checkHealth = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const { serviceAccount } = getClients()
    const config = getConfig()

    return {
      configured: !!config.apiKey && !!config.privateKey,
      account: serviceAccount?.accountAddress.toString() || null,
    }
  } catch {
    // Don't expose configuration details on error
    return {
      configured: false,
      account: null,
    }
  }
})
