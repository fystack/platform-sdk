import { describe, test, expect } from 'vitest'
import { FystackSDK, Environment, WithdrawalStatus } from '../src'

describe('Withdrawal', () => {
  const apiCredentials = {
    apiKey: import.meta.env.VITE_API_KEY_SANDBOX,
    apiSecret: import.meta.env.VITE_API_SECRET_SANDBOX
  }

  const sdk = new FystackSDK({
    credentials: apiCredentials,
    environment: Environment.Sandbox,
    logger: true
  })

  describe('requestWithdrawal', () => {
    test('should request a withdrawal successfully', async () => {
      const walletId = 'f22d4c94-f0b9-445c-9dea-b4aca3957400'
      const response = await sdk.requestWithdrawal(walletId, {
        assetId: 'a469642e-5466-4d69-834d-537f33ee5c81',
        amount: '0.0001',
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        notes: 'Test withdrawal'
      })

      console.log('response', response)
    })
  })
})
