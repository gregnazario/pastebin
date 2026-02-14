/**
 * Unit tests for API v1 request routing and error mapping.
 */

import { describe, expect, it } from 'vitest'
import { handleApiV1Request, mapApiErrorStatus, parseUploadBlobRequest } from './apiV1'

describe('mapApiErrorStatus', () => {
  it('maps validation errors to 400', () => {
    expect(mapApiErrorStatus(new Error('Invalid request: data must be an array'))).toBe(400)
  })

  it('maps unsupported media types to 415', () => {
    expect(mapApiErrorStatus(new Error('Unsupported media type for upload'))).toBe(415)
  })

  it('maps rate-limit errors to 429', () => {
    expect(mapApiErrorStatus(new Error('Too many requests. Please try again later.'))).toBe(429)
  })

  it('maps missing files to 404', () => {
    expect(mapApiErrorStatus(new Error('File not found'))).toBe(404)
  })

  it('maps availability errors to 503', () => {
    expect(mapApiErrorStatus(new Error('Service temporarily unavailable'))).toBe(503)
  })

  it('defaults unknown errors to 500', () => {
    expect(mapApiErrorStatus(new Error('Something else happened'))).toBe(500)
  })
})

describe('handleApiV1Request routing', () => {
  it('returns null for non-api paths', async () => {
    const request = new Request('https://example.com/upload', { method: 'GET' })
    const response = await handleApiV1Request(request)
    expect(response).toBeNull()
  })

  it('returns 405 for POST /api/v1/health', async () => {
    const request = new Request('https://example.com/api/v1/health', { method: 'POST' })
    const response = await handleApiV1Request(request)
    expect(response?.status).toBe(405)
  })

  it('returns capabilities payload for GET /api/v1/capabilities', async () => {
    const request = new Request('https://example.com/api/v1/capabilities', { method: 'GET' })
    const response = await handleApiV1Request(request)
    expect(response?.status).toBe(200)
    expect(response?.headers.get('x-request-id')).toBeTruthy()

    const payload = await response?.json()
    expect(payload).toMatchObject({
      apiVersion: expect.any(String),
      maxUploadBytes: expect.any(Number),
      maxFilenameLength: expect.any(Number),
      rateLimitWindowMs: expect.any(Number),
      maxUploadsPerWindow: expect.any(Number),
      maxDownloadsPerWindow: expect.any(Number),
    })
  })

  it('returns 405 for POST /api/v1/capabilities', async () => {
    const request = new Request('https://example.com/api/v1/capabilities', { method: 'POST' })
    const response = await handleApiV1Request(request)
    expect(response?.status).toBe(405)
  })

  it('returns 405 for GET /api/v1/upload', async () => {
    const request = new Request('https://example.com/api/v1/upload', { method: 'GET' })
    const response = await handleApiV1Request(request)
    expect(response?.status).toBe(405)
  })

  it('returns 405 for POST /api/v1/download', async () => {
    const request = new Request('https://example.com/api/v1/download', { method: 'POST' })
    const response = await handleApiV1Request(request)
    expect(response?.status).toBe(405)
  })

  it('returns 404 for unknown v1 API route', async () => {
    const request = new Request('https://example.com/api/v1/unknown', { method: 'GET' })
    const response = await handleApiV1Request(request)
    expect(response?.status).toBe(404)
  })
})

describe('parseUploadBlobRequest', () => {
  it('parses application/json upload bodies', async () => {
    const request = new Request('https://example.com/api/v1/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [1, 2, 3, 255],
        filename: 'encrypted.bin',
      }),
    })

    const parsed = await parseUploadBlobRequest(request)
    expect(parsed).toEqual({
      data: [1, 2, 3, 255],
      filename: 'encrypted.bin',
    })
  })

  it('parses multipart upload bodies with filename form field', async () => {
    const formData = new FormData()
    formData.set('data', new Blob([new Uint8Array([10, 20, 30, 40])]), 'blob')
    formData.set('filename', 'payload.bin')

    const request = new Request('https://example.com/api/v1/upload', {
      method: 'POST',
      body: formData,
    })

    const parsed = await parseUploadBlobRequest(request)
    expect(parsed).toEqual({
      data: [10, 20, 30, 40],
      filename: 'payload.bin',
    })
  })

  it('parses application/octet-stream upload bodies using query filename', async () => {
    const request = new Request('https://example.com/api/v1/upload?filename=raw.bin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Uint8Array([99, 100, 101]).buffer,
    })

    const parsed = await parseUploadBlobRequest(request)
    expect(parsed).toEqual({
      data: [99, 100, 101],
      filename: 'raw.bin',
    })
  })

  it('rejects unsupported upload content types', async () => {
    const request = new Request('https://example.com/api/v1/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: '<xml/>',
    })

    await expect(parseUploadBlobRequest(request)).rejects.toThrow('Unsupported media type')
  })
})
