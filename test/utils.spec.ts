import { describe, test, expect } from 'vitest'
import { computeHMAC } from '../src/utils'

describe('Utilities', () => {
  test('test compute hmac', async () => {
    const secret = 'c3c6aa8121b84d3aae4a4558956ee171'
    const digest = await computeHMAC(secret, {
      method: 'GET',
      path: '/api/v1/web3/wallet-detail',
      timestamp: '1706783229',
      body: ''
    })

    expect(digest).toBe('f8dea93ca5272d175244c0c2b853f1fd8d4d01f4ea99abf6d2e62dde853fd9a6')
  })
})
