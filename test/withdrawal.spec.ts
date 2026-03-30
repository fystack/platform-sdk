import { describe, test, expect } from 'vitest'
import { FystackSDK, Environment, WithdrawalStatus } from '../src'

describe('Withdrawal', () => {
  const apiCredentials = {
    apiKey: import.meta.env.VITE_API_KEY_PROD,
    apiSecret: import.meta.env.VITE_API_SECRET_PROD
  }

  const sdk = new FystackSDK({
    credentials: apiCredentials,
    environment: Environment.Production,
    debug: true
  })

  describe('requestWithdrawal', () => {
    test('should request a withdrawal successfully', async () => {
      const walletId = 'ca6b5c4d-753f-4c2d-af18-520f66a42bd4'
      const response = await sdk.requestWithdrawal(walletId, {
        asset: 'USDT',
        network: 'BSC_MAINNET',
        amount: '0.01',
        recipientAddress: '0xe6EBF81E9C225BbCEa9b5399E0D0d0f29f30f119',
        notes: 'Test withdrawal'
      })

      console.log('response', response)
    })
  })
})
