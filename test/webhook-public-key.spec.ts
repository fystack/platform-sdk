import { describe, test, expect } from 'vitest'
import { FystackSDK, Environment } from '../src'

describe('Webhook Public Key', () => {
  const apiCredentials = {
    apiKey: import.meta.env.VITE_API_KEY_SANDBOX,
    apiSecret: import.meta.env.VITE_API_SECRET_SANDBOX
  }

  const sdk = new FystackSDK({
    credentials: apiCredentials,
    environment: Environment.Sandbox,
    logger: true
  })

  describe('getWebhookPublicKey', () => {
    test('should get webhook public key successfully', async () => {
      const workspaceId = '229681cb-ca36-4a66-bc04-9e7abcff85e1'
      const response = await sdk.getWebhookPublicKey(workspaceId)

      console.log('response', response)

      expect(response).toBeDefined()
      expect(response.public_key).toBeDefined()
      expect(typeof response.public_key).toBe('string')
    })
  })
})
