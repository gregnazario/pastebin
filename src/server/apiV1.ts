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
  checkHealthInternal,
  downloadBlobInternal,
  validateDownloadBlobRequest,
  validateUploadBlobRequest,
  uploadBlobInternal,
} from './shelby'

const API_V1_PREFIX = '/api/v1'

/**
 * Map internal errors to safe HTTP status codes.
 */
export function mapApiErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message.toLowerCase() : ''

  if (message.includes('invalid request')) return 400
  if (message.includes('too many requests')) return 429
  if (message.includes('file not found')) return 404
  if (message.includes('service temporarily unavailable')) return 503
  if (message.includes('service configuration error')) return 503

  return 500
}

/**
 * Build a JSON response with standard headers.
 */
function jsonResponse(data: unknown, status: number = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  })
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
 * Handle v1 API requests. Returns null for non-v1 paths.
 */
export async function handleApiV1Request(request: Request): Promise<Response | null> {
  const url = new URL(request.url)

  if (!(url.pathname === API_V1_PREFIX || url.pathname.startsWith(`${API_V1_PREFIX}/`))) {
    return null
  }

  try {
    // Health endpoint
    if (url.pathname === `${API_V1_PREFIX}/health`) {
      if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'GET' })
      }

      const health = await checkHealthInternal()
      return jsonResponse(health, 200)
    }

    // Upload endpoint
    if (url.pathname === `${API_V1_PREFIX}/upload`) {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'POST' })
      }

      const json = await request.json().catch(() => {
        throw new Error('Invalid request format')
      })
      const input = validateUploadBlobRequest(json)
      const result = await uploadBlobInternal(input, request.headers)
      return jsonResponse(result, 200)
    }

    // Download endpoint
    if (
      url.pathname === `${API_V1_PREFIX}/download` ||
      url.pathname.startsWith(`${API_V1_PREFIX}/download/`)
    ) {
      if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'GET' })
      }

      const id = extractDownloadId(url)
      const input = validateDownloadBlobRequest({ id })
      const result = await downloadBlobInternal(input, request.headers)
      return jsonResponse(result, 200)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  } catch (error) {
    const status = mapApiErrorStatus(error)
    const message =
      error instanceof Error
        ? error.message
        : 'Internal server error'

    return jsonResponse({ error: message }, status)
  }
}
