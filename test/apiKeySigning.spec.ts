import crypto from 'crypto'
import { describe, test, expect } from 'vitest'
import { buildCanonicalString, signEd25519Request } from '../src/utils'

const PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIKEwTZJdm4dD43IyMtLIVeKTknb+1YCibdlkrGGbiZjA
-----END PRIVATE KEY-----`

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA1AlJfRq0X5fwCfxzZhXBFSqbPwyqjvq1OE0U5vSDK3g=
-----END PUBLIC KEY-----`

describe('buildCanonicalString', () => {
  test('matches the documented canonical string format', () => {
    const canonicalString = buildCanonicalString({
      method: 'POST',
      path: '/api/v1/workspaces/abc-123/invite',
      timestamp: '1735689600',
      body: '{"email":"a@b.com"}'
    })

    expect(canonicalString).toBe(
      'method=POST&path=/api/v1/workspaces/abc-123/invite&timestamp=1735689600&body={"email":"a@b.com"}'
    )
  })
})

describe('signEd25519Request', () => {
  const canonicalString = buildCanonicalString({
    method: 'GET',
    path: '/api/v1/web3/wallet-detail',
    timestamp: '1706783229',
    body: ''
  })

  test('produces a signature verifiable with the matching public key', () => {
    const signature = signEd25519Request(PRIVATE_KEY_PEM, canonicalString)
    const publicKey = crypto.createPublicKey(PUBLIC_KEY_PEM)

    const isValid = crypto.verify(
      null,
      Buffer.from(canonicalString),
      publicKey,
      Buffer.from(signature, 'base64')
    )

    expect(isValid).toBe(true)
  })

  test('fails verification if the canonical string is tampered with', () => {
    const signature = signEd25519Request(PRIVATE_KEY_PEM, canonicalString)
    const publicKey = crypto.createPublicKey(PUBLIC_KEY_PEM)

    const isValid = crypto.verify(
      null,
      Buffer.from(canonicalString + 'x'),
      publicKey,
      Buffer.from(signature, 'base64')
    )

    expect(isValid).toBe(false)
  })
})
