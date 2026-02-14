/**
 * Key derivation URL-fragment encoding tests.
 *
 * Validates the compact URL-safe key codec and legacy compatibility behavior.
 */

import { describe, expect, it } from 'vitest'
import { CRYPTO_CONFORMANCE_VECTORS_V1 } from '../../../shared/crypto/conformanceVectors'
import { KeyDerivationService } from './KeyDerivation'

const LEGACY_V1_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._~!$()*+,;=:@[]{}|^'

function encodeLegacyKeyToV1Fragment(data: Uint8Array): string {
  if (data.length === 0) {
    return 'k1.'
  }

  const base = LEGACY_V1_ALPHABET.length

  let leadingZeroCount = 0
  while (leadingZeroCount < data.length && data[leadingZeroCount] === 0) {
    leadingZeroCount++
  }

  if (leadingZeroCount === data.length) {
    return `k1.${LEGACY_V1_ALPHABET[0].repeat(leadingZeroCount)}`
  }

  const digits: number[] = [0]
  for (let i = leadingZeroCount; i < data.length; i++) {
    let carry = data[i]
    for (let j = 0; j < digits.length; j++) {
      const value = digits[j] * 256 + carry
      digits[j] = value % base
      carry = Math.floor(value / base)
    }
    while (carry > 0) {
      digits.push(carry % base)
      carry = Math.floor(carry / base)
    }
  }

  let encoded = LEGACY_V1_ALPHABET[0].repeat(leadingZeroCount)
  for (let i = digits.length - 1; i >= 0; i--) {
    encoded += LEGACY_V1_ALPHABET[digits[i]]
  }

  return `k1.${encoded}`
}

describe('KeyDerivationService URL key fragment encoding', () => {
  it('round-trips arbitrary bytes including leading zeros', () => {
    const source = new Uint8Array([0, 0, 1, 2, 3, 255, 128, 64, 32, 16, 8, 4, 2, 1])
    const encoded = KeyDerivationService.keyToUrlFragment(source)
    const decoded = KeyDerivationService.urlFragmentToKey(encoded)

    expect(Array.from(decoded)).toEqual(Array.from(source))
    expect(encoded.startsWith('k2.')).toBe(true)
  })

  it('decodes legacy base64url fragments for backward compatibility', () => {
    const source = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80])
    const legacyEncoded = KeyDerivationService.keyToBase64Url(source)
    const decoded = KeyDerivationService.urlFragmentToKey(legacyEncoded)

    expect(Array.from(decoded)).toEqual(Array.from(source))
  })

  it('produces shorter encoded fragments than base64url for realistic private key size', () => {
    const vector = CRYPTO_CONFORMANCE_VECTORS_V1.find((entry) => entry.id === 'vector-001')
    expect(vector).toBeDefined()
    if (!vector) return

    const privateKey = KeyDerivationService.base64UrlToKey(vector.privateKeyBase64Url)
    const compactEncoded = KeyDerivationService.keyToUrlFragment(privateKey)
    const legacyEncoded = KeyDerivationService.keyToBase64Url(privateKey)

    expect(compactEncoded.length).toBeLessThan(legacyEncoded.length)
    expect(Array.from(KeyDerivationService.urlFragmentToKey(compactEncoded))).toEqual(
      Array.from(privateKey),
    )
  })

  it('uses URL-stable characters and does not grow when URI-encoded', () => {
    const vector = CRYPTO_CONFORMANCE_VECTORS_V1.find((entry) => entry.id === 'vector-001')
    expect(vector).toBeDefined()
    if (!vector) return

    const privateKey = KeyDerivationService.base64UrlToKey(vector.privateKeyBase64Url)
    const compactEncoded = KeyDerivationService.keyToUrlFragment(privateKey)

    expect(encodeURIComponent(compactEncoded)).toBe(compactEncoded)
  })

  it('decodes percent-encoded compact fragments from copied URLs', () => {
    const source = new Uint8Array([0, 1, 2, 3, 17, 31, 63, 127, 191, 223, 239, 255])
    const encoded = KeyDerivationService.keyToUrlFragment(source)
    const percentEncoded = encodeURIComponent(encoded)
    const decoded = KeyDerivationService.urlFragmentToKey(percentEncoded)

    expect(Array.from(decoded)).toEqual(Array.from(source))
  })

  it('decodes compact fragments with a leading hash', () => {
    const source = new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2, 1])
    const encoded = KeyDerivationService.keyToUrlFragment(source)
    const decoded = KeyDerivationService.urlFragmentToKey(`#${encoded}`)

    expect(Array.from(decoded)).toEqual(Array.from(source))
  })

  it('decodes legacy k1 fragments for backward compatibility', () => {
    const source = new Uint8Array([0, 0, 10, 20, 30, 40, 50, 60, 70, 80, 200, 255, 1])
    const legacyK1 = encodeLegacyKeyToV1Fragment(source)
    const decoded = KeyDerivationService.urlFragmentToKey(legacyK1)

    expect(Array.from(decoded)).toEqual(Array.from(source))
  })
})
