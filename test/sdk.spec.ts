import { describe, test } from 'vitest'
import { FystackSDK } from '../src/sdk'
import { Environment } from '../src/config'
import { WalletType } from '../src/types'

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
      walletType: WalletType.MPC
    })

    const responseCreation = await sdk.getWalletCreationStatus(response.wallet_id)
    console.log('responseCreation', responseCreation)
  })
})
