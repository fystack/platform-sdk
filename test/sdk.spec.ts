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
      environment: Environment.Production,
      debug: true
    })

    const response = await sdk.createWallet({
      name: 'Hello Execlon 2',
      walletType: WalletType.Hyper,
      walletPurpose: WalletPurpose.General
    })

    console.log('response', response)
  })
})
