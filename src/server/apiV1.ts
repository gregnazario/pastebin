/**
 * API v1 HTTP handlers for native clients.
 *
 * Provides stable REST endpoints that mirror existing server-function behavior:
 * - GET /api/v1/health
 * - POST /api/v1/upload
 * - GET /api/v1/download?id=...
 * - GET /api/v1/download/{id}
 */

import {
  type UploadBlobRequest,
  checkHealthInternal,
  downloadBlobInternal,
  getCapabilitiesInternal,
  validateDownloadBlobRequest,
  validateUploadBlobRequest,
  uploadBlobInternal,
} from './blobs'

const API_V1_PREFIX = '/api/v1'

/**
 * Map internal errors to safe HTTP status codes.
 */
export function mapApiErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message.toLowerCase() : ''

  if (message.includes('invalid request')) return 400
  if (message.includes('unsupported media type')) return 415
  if (message.includes('too many requests')) return 429
  if (message.includes('file not found')) return 404
  if (message.includes('service temporarily unavailable')) return 503
  if (message.includes('service configuration error')) return 503

  return 500
}

/**
 * Build a JSON response with standard headers.
 */
function jsonResponse(
  data: unknown,
  status: number = 200,
  extraHeaders?: HeadersInit,
  requestId?: string,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(requestId ? { 'X-Request-Id': requestId } : {}),
      ...extraHeaders,
    },
  })
}

interface APIRequestContext {
  requestId: string
  clientPlatform: string
  clientVersion: string
}

/**
 * Normalize optional observability headers from clients.
 */
function extractRequestContext(request: Request): APIRequestContext {
  const requestIdHeader = request.headers.get('x-request-id')?.trim()
  const platformHeader = request.headers.get('x-client-platform')?.trim()
  const versionHeader = request.headers.get('x-client-version')?.trim()

  return {
    requestId: requestIdHeader || crypto.randomUUID(),
    clientPlatform: platformHeader?.slice(0, 64) || 'unknown',
    clientVersion: versionHeader?.slice(0, 64) || 'unknown',
  }
}

/**
 * Extract download ID from path or query.
 */
function extractDownloadId(url: URL): string | null {
  const queryId = url.searchParams.get('id')
  if (queryId) return queryId

  const pathPrefix = `${API_V1_PREFIX}/download/`
  if (url.pathname.startsWith(pathPrefix)) {
    const candidate = decodeURIComponent(url.pathname.slice(pathPrefix.length))
    return candidate || null
  }

  return null
}

/**
 * Parse upload request body from supported API media types.
 * Supports JSON, multipart/form-data, and application/octet-stream.
 */
export async function parseUploadBlobRequest(request: Request): Promise<UploadBlobRequest> {
  const contentType = request.headers.get('content-type')?.toLowerCase() || ''
  const url = new URL(request.url)

  if (contentType === '' || contentType.startsWith('application/json')) {
    const json = await request.json().catch(() => {
      throw new Error('Invalid request format')
    })
    return validateUploadBlobRequest(json)
  }

  if (contentType.startsWith('multipart/form-data')) {
    const formData = await request.formData().catch(() => {
      throw new Error('Invalid request format')
    })

    const fileEntry = formData.get('file') ?? formData.get('data')
    if (!(fileEntry instanceof Blob)) {
      throw new Error('Invalid request: missing multipart file payload')
    }

    const filenameEntry = formData.get('filename')
    const filenameFromPart =
      typeof (fileEntry as { name?: unknown }).name === 'string'
        ? ((fileEntry as { name: string }).name ?? '')
        : ''
    const filename =
      (typeof filenameEntry === 'string' ? filenameEntry.trim() : '') || filenameFromPart.trim()

    const data = new Uint8Array(await fileEntry.arrayBuffer())
    return validateUploadBlobRequest({ data: Array.from(data), filename })
  }

  if (contentType.startsWith('application/octet-stream')) {
    const filename =
      url.searchParams.get('filename')?.trim() || request.headers.get('x-filename')?.trim() || ''
    const data = new Uint8Array(await request.arrayBuffer())
    return validateUploadBlobRequest({ data: Array.from(data), filename })
  }

  throw new Error('Unsupported media type for upload')
}

/**
 * Handle v1 API requests. Returns null for non-v1 paths.
 */
export async function handleApiV1Request(request: Request): Promise<Response | null> {
  const url = new URL(request.url)
  const context = extractRequestContext(request)

  if (!(url.pathname === API_V1_PREFIX || url.pathname.startsWith(`${API_V1_PREFIX}/`))) {
    return null
  }

  try {
    // Health endpoint
    if (url.pathname === `${API_V1_PREFIX}/health`) {
      if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'GET' }, context.requestId)
      }

      const health = await checkHealthInternal()
      return jsonResponse(health, 200, undefined, context.requestId)
    }

    // Capabilities endpoint
    if (url.pathname === `${API_V1_PREFIX}/capabilities`) {
      if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'GET' }, context.requestId)
      }

      const capabilities = getCapabilitiesInternal()
      return jsonResponse(capabilities, 200, undefined, context.requestId)
    }

    // Upload endpoint
    if (url.pathname === `${API_V1_PREFIX}/upload`) {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'POST' }, context.requestId)
      }

      const input = await parseUploadBlobRequest(request)
      const result = await uploadBlobInternal(input, request.headers)
      return jsonResponse(result, 200, undefined, context.requestId)
    }

    // Download endpoint
    if (
      url.pathname === `${API_V1_PREFIX}/download` ||
      url.pathname.startsWith(`${API_V1_PREFIX}/download/`)
    ) {
      if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'GET' }, context.requestId)
      }

      const id = extractDownloadId(url)
      const input = validateDownloadBlobRequest({ id })
      const result = await downloadBlobInternal(input, request.headers)
      return jsonResponse(result, 200, undefined, context.requestId)
    }

    return jsonResponse({ error: 'Not found' }, 404, undefined, context.requestId)
  } catch (error) {
    const status = mapApiErrorStatus(error)
    const message =
      error instanceof Error
        ? error.message
        : 'Internal server error'

    return jsonResponse({ error: message }, status, undefined, context.requestId)
  }
}
