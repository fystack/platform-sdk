import { describe, test } from 'vitest'
import { FystackSDK, Environment, WalletType, WalletPurpose, DestinationType } from '../src'

describe('SDK', () => {
  const apiCredentials = {
    apiKey: import.meta.env.VITE_API_KEY_PROD,
    apiSecret: import.meta.env.VITE_API_SECRET_PROD
  }

  test('create new wallet', async () => {
    const sdk = new FystackSDK({
      credentials: apiCredentials,
      environment: Environment.Local,
      logger: true
    })

    const response = await sdk.rescanTransaction({
      txHash: '2oqJwVtK8QV4rV2c9Q2oqJwVtK8QV4rV2c9Q2oqJwVtK8QV4rV2c9Q2oqJwVtK8QV4rV2c9',
      networkId: '1'
    })

    console.log('response', response)
  })
})
