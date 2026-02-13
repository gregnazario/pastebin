/**
 * Unit tests for Shelby server upload behavior.
 * Verifies browser/edge-safe byte handling in commitment generation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const shelbyMocks = vi.hoisted(() => ({
  createDefaultErasureCodingProvider: vi.fn(async () => ({ provider: 'mock' })),
  expectedTotalChunksets: vi.fn(() => 1),
  generateCommitments: vi.fn(
    async (_provider: unknown, fullData: Uint8Array | ReadableStream<Uint8Array>) => ({
      schema_version: '1.0.0',
      raw_data_size: fullData instanceof Uint8Array ? fullData.length : 0,
      blob_merkle_root: '0x01',
      chunkset_commitments: [],
    }),
  ),
  createRegisterBlobPayload: vi.fn(() => ({ mockPayload: true })),
  putBlob: vi.fn(async () => undefined),
}))

const aptosMocks = vi.hoisted(() => ({
  buildSimple: vi.fn(async () => ({ tx: 'mock-transaction' })),
  signAndSubmitTransaction: vi.fn(async () => ({ hash: '0xabc123' })),
  waitForTransaction: vi.fn(async () => undefined),
}))

vi.mock('@shelby-protocol/sdk/browser', () => {
  return {
    createDefaultErasureCodingProvider: shelbyMocks.createDefaultErasureCodingProvider,
    expectedTotalChunksets: shelbyMocks.expectedTotalChunksets,
    generateCommitments: shelbyMocks.generateCommitments,
    ShelbyBlobClient: {
      createRegisterBlobPayload: shelbyMocks.createRegisterBlobPayload,
    },
  }
})

vi.mock('@shelby-protocol/sdk/node', () => {
  class ShelbyNodeClient {
    rpc = {
      putBlob: shelbyMocks.putBlob,
    }
  }

  return {
    ShelbyNodeClient,
  }
})

vi.mock('@aptos-labs/ts-sdk', () => {
  class Aptos {
    transaction = {
      build: {
        simple: aptosMocks.buildSimple,
      },
    }

    signAndSubmitTransaction = aptosMocks.signAndSubmitTransaction
    waitForTransaction = aptosMocks.waitForTransaction
  }

  class AptosConfig {
  }

  class Ed25519PrivateKey {
  }

  return {
    Account: {
      fromPrivateKey: vi.fn(() => ({
        accountAddress: {
          toString: () => '0xservice',
        },
      })),
    },
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network: {
      SHELBYNET: 'SHELBYNET',
    },
    PrivateKey: {
      formatPrivateKey: vi.fn((key: string) => key),
    },
    PrivateKeyVariants: {
      Ed25519: 'Ed25519',
    },
  }
})

describe('uploadBlobInternal', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    process.env.SHELBY_API_KEY = 'test-api-key-12345'
    process.env.SHELBY_PRIVATE_KEY = `0x${'11'.repeat(32)}`
    process.env.DEFAULT_EXPIRATION_DAYS = '30'
  })

  it('passes Uint8Array data to generateCommitments (Buffer-free path)', async () => {
    const { uploadBlobInternal } = await import('./shelby')

    await uploadBlobInternal({
      data: [1, 2, 3, 4],
      filename: 'sample.txt',
    })

    expect(shelbyMocks.generateCommitments).toHaveBeenCalledTimes(1)

    const [, byteInput] = shelbyMocks.generateCommitments.mock.calls[0] as [
      unknown,
      Uint8Array | ReadableStream<Uint8Array>,
    ]
    expect(byteInput).toBeInstanceOf(Uint8Array)
    expect(Array.from(byteInput as Uint8Array)).toEqual([1, 2, 3, 4])
  })
})
