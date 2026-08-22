import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { describe, test, expect } from 'vitest'
import { LocalPrivateKeySigner, AwsKmsSigner } from '../src'
import { buildCanonicalString } from '../src/utils'

const canonicalString = buildCanonicalString({
  method: 'POST',
  path: '/api/v1/wallets/a16fdca6-5b7b-4668-83f7-826d4db44594/withdrawals',
  timestamp: '1735689600',
  body: '{"amount":"10000"}'
})

const verify = (signature: string, publicKeyPem: string) =>
  crypto.verify(
    null,
    Buffer.from(canonicalString),
    crypto.createPublicKey(publicKeyPem),
    Buffer.from(signature, 'base64')
  )

describe('LocalPrivateKeySigner', () => {
  test('produces a signature verifiable with the derived public key', async () => {
    const privateKeyPem = fs.readFileSync(path.resolve(process.cwd(), 'pk.pem'), 'utf8')
    const publicKeyPem = crypto
      .createPublicKey(privateKeyPem)
      .export({ type: 'spki', format: 'pem' })
      .toString()

    const signature = await new LocalPrivateKeySigner(privateKeyPem).sign(canonicalString)

    expect(verify(signature, publicKeyPem)).toBe(true)
  })
})

describe('AwsKmsSigner', () => {
  // Requires localstack on :4566 with an ECC_NIST_EDWARDS25519 SIGN_VERIFY key
  // aliased as alias/signer, and its public key exported to pub.pem.
  const signer = new AwsKmsSigner({
    keyId: 'alias/signer',
    clientConfig: {
      region: 'ap-southeast-1',
      endpoint: 'http://localhost:4566',
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
    }
  })

  test('produces a signature verifiable with the KMS public key', async () => {
    const publicKeyPem = fs.readFileSync(path.resolve(process.cwd(), 'pub.pem'), 'utf8')

    const signature = await signer.sign(canonicalString)

    expect(verify(signature, publicKeyPem)).toBe(true)
  })

  test('fails verification if the canonical string is tampered with', async () => {
    const publicKeyPem = fs.readFileSync(path.resolve(process.cwd(), 'pub.pem'), 'utf8')

    const signature = await signer.sign(canonicalString + 'x')

    expect(verify(signature, publicKeyPem)).toBe(false)
  })
})
