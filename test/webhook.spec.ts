import { describe, test, expect } from 'vitest'
import { APIService } from '../src/api'

describe('SDK', () => {
  const apiCredentials = {
    APIKey: '299b7a7b-3586-4ded-a5bf-fbe61059a33d',
    APISecret: 'b989abf2aea3d981bda7e358f78bb637'
  }

  test('create new checkout', async () => {
    const apiService = new APIService(apiCredentials)
    const event = {
      webhook_id: '138dc36f-f09b-4210-ad5d-630896be2761',
      resource_id: 'checkout:664f5839-2b5a-4b8b-8507-3b9b4815b9c1:Pending',
      url: 'https://webhook.site/a8628b11-ca24-4509-9750-d4ac219c05d6',
      payload: {
        amount: '10',
        chain_id: 11155111,
        checkout_id: '664f5839-2b5a-4b8b-8507-3b9b4815b9c1',
        checkout_payment_id: 'b2f7d8b6-4e90-43b4-be6d-a5910ef53fdd',
        deposit_address: '0x06A388F07F0EB0605D57947A7F1856a5e091940b',
        from_address: 'ACCLHbGJYGy1vSL6RjHvaraT3XZn1bXMxz5fPVRA112G',
        network_code: 'ETHER_SEPOLIA_TESTNET',
        network_id: '23d13c03-1f3c-4e2a-9aef-1771a244b7f6',
        status: 'Pending',
        timestamp: '2024-12-25T21:47:42.025101+07:00',
        tx_hash: '0x914dd86fde7935ec8046623f816ec4fbad898142bdd851b05268ad882c2c9a8a'
      },
      event: 'payment.received'
    }
    const signature = '605c75aaa4394b2d1d1fce205efea8d490f3f9135ee78b496bbe8f111cb6484c'

    const isValid = await apiService.Webhook.verifyEvent(event, signature)
    expect(isValid).toBe(true)
  })
})
