import { describe, test } from 'vitest'
import { APIService } from '../src/api'

describe('SDK', () => {
  const apiCredentials = {
    APIKey: '299b7a7b-3586-4ded-a5bf-fbe61059a33d',
    APISecret: 'b989abf2aea3d981bda7e358f78bb637'
  }

  test('create new checkout', async () => {
    const apiService = new APIService(apiCredentials)
    const response = await apiService.Payment.createCheckout({
      price: '10',
      currency: 'USD',
      supported_assets: ['USDC:11155111'],
      underpaid_cover_percent: 5.0,
      description: 'Access to premium features and exclusive content.',
      success_url: 'https://example.com/payment/success',
      cancel_url: 'https://example.com/payment/cancel',
      product_id: '4c57fae9-1a54-4a1b-9d94-00d5b4a3e1d2',
      customer_id: 'bc5bd50d-265e-4ea9-b312-bd8de5118683',
      order_id: 'bc5bd50d-265e-4ea9-b312-bd8de5118683',
      enable_localization: false,
      destination_wallet_id: '04773c92-c3a9-4eb0-9b5c-dbe731933fdb',
      from_address: 'ACCLHbGJYGy1vSL6RjHvaraT3XZn1bXMxz5fPVRA112G',
      expiry_duration_seconds: 3600
    })

    console.log(response)
  })
})
