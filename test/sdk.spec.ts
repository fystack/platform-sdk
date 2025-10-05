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
      logger: true
    })

    const response = await sdk.createWallet({
      name: 'Hello Solana 3',
      walletType: WalletType.MPC,
      walletPurpose: WalletPurpose.User,
      sweepTaskParams: {
        minTriggerValueUsd: 100,
        destinationWalletId: '44651c57-b5f6-47f2-8688-fff633490a96',
        destinationType: DestinationType.InternalWallet
      },
      sweepTaskId: '123'
    })

    const responseCreation = await sdk.getWalletCreationStatus(response.wallet_id)
    console.log('responseCreation', responseCreation)
  })
})
