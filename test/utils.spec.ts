import { describe, test, expect } from 'vitest'
import { computeHMAC } from '../src/utils'

describe('Utilities', () => {
  test('test compute hmac', async () => {
    const secret = '9c9f30c32a0634ba615b27614c473d159df7a6920ae22b8660a86c3841776234'
    const digest = await computeHMAC(secret, {
      method: 'GET',
      path: '/api/v1/web3/transaction',
      timestamp: 1629780000,
      body: 'test'
    })

    expect(digest).toBe('480d0925c079c7fa012aa9b22252f62aa643a75b0caeb83c3c828339b78f1466')
  })
})
