/**
 * Encrypted blob persistence adapters.
 *
 * The server stores ciphertext only. Encryption and decryption stay on the
 * client. Adapters are filesystem (local/dev), S3-compatible object storage
 * (Cloudflare R2 and other free-tier providers), and in-memory (tests).
 */

import { AwsClient } from 'aws4fetch'

/** Metadata stored alongside ciphertext. */
export interface BlobMeta {
  expiresAt: number
  filename: string
  storedAt: number
}

/** Ciphertext plus expiration metadata. */
export interface StoredBlob {
  data: Uint8Array
  meta: BlobMeta
}

/** Supported persistence backends. */
export type BlobStoreKind = 'memory' | 'filesystem' | 's3'

/** Persistence interface used by upload/download handlers. */
export interface BlobStore {
  readonly kind: BlobStoreKind
  readonly account: string
  readonly durable: boolean
  put(id: string, data: Uint8Array, meta: BlobMeta): Promise<void>
  get(id: string): Promise<StoredBlob | null>
  delete(id: string): Promise<void>
  sweepExpired(): Promise<number>
}

/** Optional clock and S3 fetch injection for tests. */
export interface BlobStoreOptions {
  now?: () => number
  s3Fetch?: SignedFetcher
  durable?: boolean
}

/** Minimal fetch wrapper used by the S3 adapter (aws4fetch or a test double). */
export interface SignedFetcher {
  fetch(input: string, init?: RequestInit): Promise<Response>
}

/** S3-compatible endpoint configuration. */
export interface S3Config {
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  endpoint?: string
  forcePathStyle: boolean
  sessionToken?: string
}

const PASTE_PREFIX = 'pastes/'

/**
 * True on serverless hosts where local disk is per-instance and ephemeral.
 */
export function isEphemeralCompute(env: NodeJS.Dict<string> = process.env): boolean {
  return Boolean(env.VERCEL || env.AWS_LAMBDA_FUNCTION_NAME || env.NETLIFY)
}

/**
 * Parse common truthy/falsey env strings. Unknown values use `fallback`.
 */
export function parseEnvBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === '') return fallback
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

/**
 * Reject IDs that could escape a filesystem directory or S3 prefix.
 *
 * `..` is only rejected as a complete path segment. Filenames such as
 * `report..final.txt` are allowed because `/` and `\\` already prevent traversal.
 */
export function assertSafeBlobId(id: string): void {
  if (
    id.length === 0 ||
    id.length > 500 ||
    id === '.' ||
    id === '..' ||
    id.includes('/') ||
    id.includes('\\') ||
    id.includes('\0')
  ) {
    throw new Error('Invalid request: malformed file ID')
  }
}

/**
 * Resolve which adapter to construct from environment variables.
 *
 * Serverless hosts (Vercel/Lambda/Netlify) do not auto-select filesystem:
 * that would accept uploads into ephemeral `/tmp` and 404 them later.
 * Set `BLOB_STORE=filesystem` explicitly to opt in.
 */
export function resolveBlobStoreKind(
  env: NodeJS.Dict<string> = process.env,
): BlobStoreKind {
  const explicit = env.BLOB_STORE?.trim().toLowerCase()
  if (explicit === 'memory') return 'memory'
  if (explicit === 'filesystem' || explicit === 'fs') return 'filesystem'
  if (explicit === 's3') return 's3'
  if (explicit) {
    throw new Error('Service configuration error')
  }

  if (hasS3Credentials(env)) return 's3'
  if (env.VITEST === 'true' || env.NODE_ENV === 'test') return 'memory'
  if (isEphemeralCompute(env)) {
    throw new Error('Service configuration error')
  }
  return 'filesystem'
}

/**
 * Construct a blob store from environment configuration.
 */
export function createBlobStoreFromEnv(
  env: NodeJS.Dict<string> = process.env,
  options: BlobStoreOptions = {},
): BlobStore {
  const kind = resolveBlobStoreKind(env)
  const now = options.now ?? Date.now

  if (kind === 'memory') {
    return createMemoryBlobStore({ now })
  }

  if (kind === 'filesystem') {
    const durable = options.durable ?? !isEphemeralCompute(env)
    if (isEphemeralCompute(env)) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'Filesystem blob store on ephemeral compute; uploads will not persist',
        }),
      )
    }
    return createFilesystemBlobStore(resolveFilesystemDir(env), { now, durable })
  }

  return createS3BlobStore(readS3Config(env), {
    now,
    s3Fetch: options.s3Fetch,
  })
}

/**
 * In-memory store used by unit tests and ephemeral local experiments.
 */
export function createMemoryBlobStore(
  options: Pick<BlobStoreOptions, 'now'> = {},
): BlobStore {
  const objects = new Map<string, StoredBlob>()
  const now = options.now ?? Date.now

  return {
    kind: 'memory',
    account: 'memory',
    durable: false,
    async put(id, data, meta) {
      assertSafeBlobId(id)
      objects.set(id, { data: new Uint8Array(data), meta: { ...meta } })
    },
    async get(id) {
      assertSafeBlobId(id)
      const stored = objects.get(id)
      if (!stored) return null
      if (stored.meta.expiresAt <= now()) {
        objects.delete(id)
        return null
      }
      return { data: new Uint8Array(stored.data), meta: { ...stored.meta } }
    },
    async delete(id) {
      assertSafeBlobId(id)
      objects.delete(id)
    },
    async sweepExpired() {
      let removed = 0
      for (const [id, stored] of objects) {
        if (stored.meta.expiresAt <= now()) {
          objects.delete(id)
          removed++
        }
      }
      return removed
    },
  }
}

/**
 * Local filesystem store. Default for development with no cloud credentials.
 */
export function createFilesystemBlobStore(
  directory: string,
  options: Pick<BlobStoreOptions, 'now' | 'durable'> = {},
): BlobStore {
  const now = options.now ?? Date.now
  const durable = options.durable ?? true
  let ensured = false

  const io = async () => {
    const [fs, path] = await Promise.all([import('node:fs/promises'), import('node:path')])
    const root = path.resolve(directory)
    if (!ensured) {
      await fs.mkdir(root, { recursive: true })
      ensured = true
    }
    return { fs, path, root }
  }

  const pathsFor = (root: string, pathMod: typeof import('node:path'), id: string) => {
    const filePath = pathMod.join(root, id)
    const metaPath = pathMod.join(root, `${id}.meta.json`)
    assertPathInsideRoot(root, filePath, pathMod)
    assertPathInsideRoot(root, metaPath, pathMod)
    return { filePath, metaPath }
  }

  return {
    kind: 'filesystem',
    account: 'filesystem:local',
    durable,
    async put(id, data, meta) {
      assertSafeBlobId(id)
      const { fs, path, root } = await io()
      const { filePath, metaPath } = pathsFor(root, path, id)
      const tmpFile = `${filePath}.tmp`
      const tmpMeta = `${metaPath}.tmp`
      await fs.writeFile(tmpFile, data)
      await fs.writeFile(tmpMeta, JSON.stringify(meta), 'utf8')
      await fs.rename(tmpFile, filePath)
      await fs.rename(tmpMeta, metaPath)
    },
    async get(id) {
      assertSafeBlobId(id)
      const { fs, path, root } = await io()
      const { filePath, metaPath } = pathsFor(root, path, id)
      try {
        const rawMeta = await fs.readFile(metaPath, 'utf8')
        const meta = JSON.parse(rawMeta) as BlobMeta
        if (!isBlobMeta(meta)) return null
        if (meta.expiresAt <= now()) {
          await deleteQuietly(fs, filePath, metaPath)
          return null
        }
        const buf = await fs.readFile(filePath)
        return { data: new Uint8Array(buf), meta }
      } catch (error) {
        if (isNotFound(error)) return null
        throw error
      }
    },
    async delete(id) {
      assertSafeBlobId(id)
      const { fs, path, root } = await io()
      const { filePath, metaPath } = pathsFor(root, path, id)
      await deleteQuietly(fs, filePath, metaPath)
    },
    async sweepExpired() {
      const { fs, path, root } = await io()
      const names = await fs.readdir(root)
      let removed = 0
      for (const name of names) {
        if (!name.endsWith('.meta.json')) continue
        const id = name.slice(0, -'.meta.json'.length)
        try {
          assertSafeBlobId(id)
          const metaPath = path.join(root, name)
          const rawMeta = await fs.readFile(metaPath, 'utf8')
          const meta = JSON.parse(rawMeta) as BlobMeta
          if (isBlobMeta(meta) && meta.expiresAt <= now()) {
            const { filePath } = pathsFor(root, path, id)
            await deleteQuietly(fs, filePath, metaPath)
            removed++
          }
        } catch {
          // Skip unreadable or malformed entries; do not fail the sweep.
        }
      }
      return removed
    },
  }
}

/**
 * S3-compatible store. Intended for Cloudflare R2's free tier in production.
 */
export function createS3BlobStore(
  config: S3Config,
  options: BlobStoreOptions = {},
): BlobStore {
  const now = options.now ?? Date.now
  const client: SignedFetcher =
    options.s3Fetch ??
    new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      sessionToken: config.sessionToken,
      region: config.region,
      service: 's3',
    })

  const objectUrl = (id: string): string => buildS3ObjectUrl(config, `${PASTE_PREFIX}${id}`)

  return {
    kind: 's3',
    account: `s3:${config.bucket}`,
    durable: true,
    async put(id, data, meta) {
      assertSafeBlobId(id)
      const response = await client.fetch(objectUrl(id), {
        method: 'PUT',
        body: toBodyInit(data),
        headers: {
          'content-type': 'application/octet-stream',
          'x-amz-meta-expires-at': String(meta.expiresAt),
          'x-amz-meta-filename': encodeURIComponent(meta.filename),
          'x-amz-meta-stored-at': String(meta.storedAt),
        },
      })
      await assertS3Ok(response, 'PUT')
    },
    async get(id) {
      assertSafeBlobId(id)
      const response = await client.fetch(objectUrl(id), { method: 'GET' })
      if (response.status === 404) return null
      await assertS3Ok(response, 'GET')

      const expiresHeader = response.headers.get('x-amz-meta-expires-at')
      const storedHeader = response.headers.get('x-amz-meta-stored-at')
      const expiresAt = expiresHeader ? Number(expiresHeader) : Number.NaN
      const storedAt = storedHeader ? Number(storedHeader) : now()
      const filename = decodeURIComponent(response.headers.get('x-amz-meta-filename') || 'file')
      const buffer = new Uint8Array(await response.arrayBuffer())

      if (!Number.isFinite(expiresAt) || expiresAt <= now()) {
        await deleteS3Object(client, objectUrl(id))
        return null
      }

      const meta: BlobMeta = {
        expiresAt,
        storedAt: Number.isFinite(storedAt) ? storedAt : now(),
        filename,
      }

      return { data: buffer, meta }
    },
    async delete(id) {
      assertSafeBlobId(id)
      await deleteS3Object(client, objectUrl(id))
    },
    async sweepExpired() {
      // Object expiry for un-fetched blobs is a bucket lifecycle rule on pastes/.
      return 0
    },
  }
}

/**
 * Build a path-style or virtual-hosted S3 object URL.
 */
export function buildS3ObjectUrl(config: S3Config, key: string): string {
  const encodedKey = key.split('/').map(encodeURIComponent).join('/')
  const endpoint = config.endpoint?.replace(/\/+$/, '')

  if (endpoint) {
    if (config.forcePathStyle) {
      return `${endpoint}/${config.bucket}/${encodedKey}`
    }
    const url = new URL(endpoint)
    if (!url.hostname.startsWith(`${config.bucket}.`)) {
      url.hostname = `${config.bucket}.${url.hostname}`
    }
    url.pathname = `/${encodedKey}`
    return url.toString().replace(/\/$/, '')
  }

  const region = config.region && config.region !== 'auto' ? config.region : 'us-east-1'
  return `https://${config.bucket}.s3.${region}.amazonaws.com/${encodedKey}`
}

/**
 * Parse S3 settings from env. Exported for unit tests.
 */
export function s3ConfigFromEnv(env: NodeJS.Dict<string> = process.env): S3Config {
  return readS3Config(env)
}

function hasS3Credentials(env: NodeJS.Dict<string>): boolean {
  return Boolean(env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY)
}

function readS3Config(env: NodeJS.Dict<string>): S3Config {
  const bucket = env.S3_BUCKET?.trim()
  const accessKeyId = env.S3_ACCESS_KEY_ID?.trim()
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY?.trim()
  const endpoint = env.S3_ENDPOINT?.trim() || undefined
  const sessionToken = env.S3_SESSION_TOKEN?.trim() || undefined

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('Service configuration error')
  }

  const region = env.S3_REGION?.trim() || (endpoint?.includes('r2.cloudflarestorage.com') ? 'auto' : 'us-east-1')
  const forcePathStyle = parseEnvBoolean(env.S3_FORCE_PATH_STYLE, Boolean(endpoint))

  return {
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    endpoint,
    forcePathStyle,
    sessionToken,
  }
}

function resolveFilesystemDir(env: NodeJS.Dict<string>): string {
  if (env.BLOB_STORE_DIR?.trim()) return env.BLOB_STORE_DIR.trim()
  if (env.VERCEL) return '/tmp/secupaste-blobs'
  return '.data/blobs'
}

function isBlobMeta(value: unknown): value is BlobMeta {
  if (!value || typeof value !== 'object') return false
  const meta = value as BlobMeta
  return (
    typeof meta.expiresAt === 'number' &&
    typeof meta.storedAt === 'number' &&
    typeof meta.filename === 'string'
  )
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
}

function assertPathInsideRoot(
  root: string,
  candidate: string,
  pathMod: typeof import('node:path'),
): void {
  const relative = pathMod.relative(root, candidate)
  if (relative.startsWith('..') || pathMod.isAbsolute(relative)) {
    throw new Error('Invalid request: malformed file ID')
  }
}

/**
 * Fetch accepts Uint8Array at runtime. Cast instead of copying up to 100 MB.
 */
function toBodyInit(data: Uint8Array): BodyInit {
  return data as unknown as BodyInit
}

async function assertS3Ok(response: Response, operation: string): Promise<void> {
  if (response.ok) return
  const body = (await response.text().catch(() => '')).slice(0, 500)
  console.error(
    JSON.stringify({
      level: 'error',
      message: 'S3 request failed',
      operation,
      status: response.status,
      body,
    }),
  )
  throw new Error('Service temporarily unavailable')
}

async function deleteQuietly(
  fs: typeof import('node:fs/promises'),
  ...paths: string[]
): Promise<void> {
  await Promise.all(
    paths.map(async (filePath) => {
      try {
        await fs.unlink(filePath)
      } catch (error) {
        if (!isNotFound(error)) throw error
      }
    }),
  )
}

async function deleteS3Object(client: SignedFetcher, url: string): Promise<void> {
  const response = await client.fetch(url, { method: 'DELETE' })
  if (response.status === 404) return
  await assertS3Ok(response, 'DELETE')
}
