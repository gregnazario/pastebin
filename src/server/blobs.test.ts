/**
 * Unit tests for encrypted paste upload/download against the free blob store.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('uploadBlobInternal / downloadBlobInternal', () => {
  const previous = {
    BLOB_STORE: process.env.BLOB_STORE,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    DEFAULT_EXPIRATION_DAYS: process.env.DEFAULT_EXPIRATION_DAYS,
    NODE_ENV: process.env.NODE_ENV,
  }

  beforeEach(() => {
    process.env.BLOB_STORE = 'memory'
    process.env.DEFAULT_EXPIRATION_DAYS = '30'
    process.env.NODE_ENV = 'test'
    delete process.env.S3_BUCKET
    delete process.env.S3_ACCESS_KEY_ID
    delete process.env.S3_SECRET_ACCESS_KEY
  })

  afterEach(async () => {
    const { resetServerStateForTests } = await import('./blobs')
    resetServerStateForTests()

    restoreEnv('BLOB_STORE', previous.BLOB_STORE)
    restoreEnv('S3_BUCKET', previous.S3_BUCKET)
    restoreEnv('S3_ACCESS_KEY_ID', previous.S3_ACCESS_KEY_ID)
    restoreEnv('S3_SECRET_ACCESS_KEY', previous.S3_SECRET_ACCESS_KEY)
    restoreEnv('DEFAULT_EXPIRATION_DAYS', previous.DEFAULT_EXPIRATION_DAYS)
    restoreEnv('NODE_ENV', previous.NODE_ENV)
  })

  it('round-trips ciphertext bytes without interpreting them', async () => {
    const { uploadBlobInternal, downloadBlobInternal, resetServerStateForTests } = await import(
      './blobs'
    )
    resetServerStateForTests()

    const ciphertext = [0, 1, 2, 250, 255]
    const uploaded = await uploadBlobInternal({
      data: ciphertext,
      filename: 'secret.bin',
    })

    expect(uploaded.id).toMatch(/^pastebin-\d+-secret.bin-[0-9a-f]+$/)
    expect(uploaded.expiresAt).toBeGreaterThan(Date.now())

    const downloaded = await downloadBlobInternal({ id: uploaded.id })
    expect(downloaded.data).toEqual(ciphertext)
  })

  it('returns file not found for unknown IDs', async () => {
    const { downloadBlobInternal, resetServerStateForTests } = await import('./blobs')
    resetServerStateForTests()

    await expect(
      downloadBlobInternal({ id: 'pastebin-1-missing.bin-abcd' }),
    ).rejects.toThrow('File not found')
  })

  it('reports the memory store as configured', async () => {
    const { checkHealthInternal, resetServerStateForTests } = await import('./blobs')
    resetServerStateForTests()

    const health = await checkHealthInternal()
    expect(health).toEqual({ configured: true, account: 'memory' })
  })
})

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key]
    return
  }
  process.env[key] = value
}
