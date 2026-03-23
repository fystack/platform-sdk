import { describe, test, expect } from 'vitest'
import { FystackSDK, Environment, SweepStrategy, DestinationType } from '../src'

describe('Sweep Task', () => {
  const apiCredentials = {
    apiKey: import.meta.env.VITE_API_KEY_SANDBOX,
    apiSecret: import.meta.env.VITE_API_SECRET_SANDBOX
  }

  const sdk = new FystackSDK({
    credentials: apiCredentials,
    environment: Environment.Sandbox,
    workspaceId: '229681cb-ca36-4a66-bc04-9e7abcff85e1',
    debug: true
  })

  describe('createSweepTask', () => {
    test('should create a sweep task successfully', async () => {
      const response = await sdk.automation.createSweepTask({
        name: 'Test Sweep Task',
        strategy: SweepStrategy.Periodic,
        frequencyInSeconds: 3600,
        minTriggerValueUsd: 50,
        destinationWalletId: 'f22d4c94-f0b9-445c-9dea-b4aca3957400',
        destinationType: DestinationType.InternalWallet,
        walletIds: ['f22d4c94-f0b9-445c-9dea-b4aca3957400']
      })

      console.log('response', response)

      expect(response).toBeDefined()
      expect(response.id).toBeDefined()
      expect(response.name).toBe('Test Sweep Task')
      expect(response.strategy).toBe('periodic')
      expect(response.frequency_in_seconds).toBe(3600)
      expect(response.enabled).toBe(true)
    })
  })
})
