/**
 * Unit tests for encrypted blob storage adapters.
 * Covers memory, filesystem, and a mocked S3-compatible backend.
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  assertSafeBlobId,
  buildS3ObjectUrl,
  createBlobStoreFromEnv,
  createFilesystemBlobStore,
  createMemoryBlobStore,
  createS3BlobStore,
  resolveBlobStoreKind,
  type SignedFetcher,
} from './storage'

describe('assertSafeBlobId', () => {
  it('accepts paste IDs used by the public API', () => {
    expect(() => assertSafeBlobId('pastebin-123-notes.txt-abcd')).not.toThrow()
  })

  it('rejects path traversal', () => {
    expect(() => assertSafeBlobId('../secret')).toThrow('malformed file ID')
    expect(() => assertSafeBlobId('a/b')).toThrow('malformed file ID')
  })
})

describe('resolveBlobStoreKind', () => {
  it('uses explicit BLOB_STORE values', () => {
    expect(resolveBlobStoreKind({ BLOB_STORE: 'memory' })).toBe('memory')
    expect(resolveBlobStoreKind({ BLOB_STORE: 'fs' })).toBe('filesystem')
    expect(resolveBlobStoreKind({ BLOB_STORE: 's3' })).toBe('s3')
  })

  it('selects s3 when credentials are present', () => {
    expect(
      resolveBlobStoreKind({
        S3_BUCKET: 'secupaste',
        S3_ACCESS_KEY_ID: 'id',
        S3_SECRET_ACCESS_KEY: 'secret',
      }),
    ).toBe('s3')
  })

  it('defaults to memory in tests and filesystem otherwise', () => {
    expect(resolveBlobStoreKind({ NODE_ENV: 'test' })).toBe('memory')
    expect(resolveBlobStoreKind({ NODE_ENV: 'production' })).toBe('filesystem')
  })
})

describe('createMemoryBlobStore', () => {
  it('round-trips ciphertext and hides expired objects', async () => {
    let now = 1_000
    const store = createMemoryBlobStore({ now: () => now })
    const data = new Uint8Array([1, 2, 3, 9])

    await store.put('pastebin-1-a.txt-aa', data, {
      expiresAt: 1_500,
      filename: 'a.txt',
      storedAt: 1_000,
    })

    const fresh = await store.get('pastebin-1-a.txt-aa')
    expect(Array.from(fresh?.data ?? [])).toEqual([1, 2, 3, 9])

    now = 2_000
    expect(await store.get('pastebin-1-a.txt-aa')).toBeNull()
  })
})

describe('createFilesystemBlobStore', () => {
  let dir: string | undefined

  afterEach(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true })
      dir = undefined
    }
  })

  it('persists and reads ciphertext from disk', async () => {
    dir = await mkdtemp(join(tmpdir(), 'secupaste-blobs-'))
    const store = createFilesystemBlobStore(dir)
    const id = 'pastebin-99-payload.bin-dead'
    await store.put(id, new Uint8Array([7, 8, 9]), {
      expiresAt: Date.now() + 60_000,
      filename: 'payload.bin',
      storedAt: Date.now(),
    })

    const stored = await store.get(id)
    expect(stored).not.toBeNull()
    expect(Array.from(stored?.data ?? [])).toEqual([7, 8, 9])
    expect(stored?.meta.filename).toBe('payload.bin')
  })

  it('returns null for expired filesystem blobs', async () => {
    dir = await mkdtemp(join(tmpdir(), 'secupaste-blobs-'))
    let now = 5_000
    const store = createFilesystemBlobStore(dir, { now: () => now })
    const id = 'pastebin-99-old.bin-dead'
    await store.put(id, new Uint8Array([1]), {
      expiresAt: 6_000,
      filename: 'old.bin',
      storedAt: 5_000,
    })

    now = 9_000
    expect(await store.get(id)).toBeNull()
  })
})

describe('createS3BlobStore', () => {
  it('PUTs ciphertext with expiration metadata and GETs it back', async () => {
    const objects = new Map<string, { body: Uint8Array; headers: Headers }>()
    const fetcher: SignedFetcher = {
      async fetch(input, init) {
        const method = (init?.method || 'GET').toUpperCase()
        if (method === 'PUT') {
          const body = init?.body
          const bytes =
            body instanceof Uint8Array
              ? body
              : new Uint8Array(await new Response(body as BodyInit).arrayBuffer())
          objects.set(input, {
            body: bytes,
            headers: new Headers(init?.headers),
          })
          return new Response(null, { status: 200 })
        }
        if (method === 'GET') {
          const stored = objects.get(input)
          if (!stored) return new Response(null, { status: 404 })
          return new Response(stored.body, { status: 200, headers: stored.headers })
        }
        if (method === 'DELETE') {
          objects.delete(input)
          return new Response(null, { status: 204 })
        }
        return new Response(null, { status: 405 })
      },
    }

    const store = createS3BlobStore(
      {
        bucket: 'secupaste',
        region: 'auto',
        accessKeyId: 'id',
        secretAccessKey: 'secret',
        endpoint: 'https://example.r2.cloudflarestorage.com',
        forcePathStyle: true,
      },
      { s3Fetch: fetcher },
    )

    const id = 'pastebin-1-cipher.bin-ffff'
    await store.put(id, new Uint8Array([11, 22, 33]), {
      expiresAt: Date.now() + 60_000,
      filename: 'cipher.bin',
      storedAt: Date.now(),
    })

    const stored = await store.get(id)
    expect(Array.from(stored?.data ?? [])).toEqual([11, 22, 33])
    expect(stored?.meta.filename).toBe('cipher.bin')
  })
})

describe('buildS3ObjectUrl', () => {
  it('uses path-style URLs for R2 endpoints', () => {
    expect(
      buildS3ObjectUrl(
        {
          bucket: 'secupaste',
          region: 'auto',
          accessKeyId: 'id',
          secretAccessKey: 'secret',
          endpoint: 'https://abc.r2.cloudflarestorage.com',
          forcePathStyle: true,
        },
        'pastes/pastebin-1-a-b',
      ),
    ).toBe('https://abc.r2.cloudflarestorage.com/secupaste/pastes/pastebin-1-a-b')
  })
})

describe('createBlobStoreFromEnv', () => {
  it('builds a memory store from BLOB_STORE=memory', () => {
    const store = createBlobStoreFromEnv({ BLOB_STORE: 'memory' })
    expect(store.kind).toBe('memory')
    expect(store.account).toBe('memory')
  })
})
