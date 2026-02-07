/**
 * Crypto conformance tests.
 *
 * These tests ensure the shared conformance vectors decrypt correctly using
 * the current web cryptography implementation.
 */

import { describe, expect, it } from 'vitest'
import { CRYPTO_CONFORMANCE_VECTORS_V1 } from '../../../shared/crypto/conformanceVectors'
import { HybridEncryptionService } from './HybridEncryption'
import { KeyDerivationService } from './KeyDerivation'

/**
 * Decode a base64url string into bytes.
 */
function decodeBase64Url(value: string): Uint8Array {
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const remainder = base64.length % 4
  if (remainder > 0) {
    base64 += '='.repeat(4 - remainder)
  }

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

describe('crypto conformance vectors v1', () => {
  it('decrypts vector-001 with expected plaintext and metadata', async () => {
    const vector = CRYPTO_CONFORMANCE_VECTORS_V1.find((entry) => entry.id === 'vector-001')
    expect(vector).toBeDefined()

    if (!vector) return

    const payloadBytes = decodeBase64Url(vector.serializedPayloadBase64Url)
    const privateKey = KeyDerivationService.base64UrlToKey(vector.privateKeyBase64Url)
    const expectedPlaintext = decodeBase64Url(vector.plaintextBase64Url)

    // Verify key fragment round-trips cleanly.
    expect(KeyDerivationService.keyToBase64Url(privateKey)).toBe(vector.privateKeyBase64Url)

    const payload = HybridEncryptionService.deserializePayload(payloadBytes)
    const { data, metadata } = await HybridEncryptionService.decrypt(
      payload,
      vector.password,
      privateKey,
    )

    expect(Array.from(data)).toEqual(Array.from(expectedPlaintext))
    expect(metadata).toEqual(vector.metadata)
  })
})
