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

    const response = await sdk.createWallet({
      name: 'Hello Solana 5',
      walletType: WalletType.Standard,
      walletPurpose: WalletPurpose.User,
      sweepTaskParams: {
        minTriggerValueUsd: 100,
        destinationWalletId: '5aad7600-fcc0-47a4-9051-b486e33cc516',
        destinationType: DestinationType.InternalWallet
      }
    })

    console.log('response', response)
  })
})
