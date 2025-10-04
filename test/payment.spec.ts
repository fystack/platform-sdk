import { describe, test } from 'vitest'
import { PaymentService, Environment } from '../src'

describe('SDK', () => {
  const apiCredentials = {
    APIKey: import.meta.env.VITE_API_KEY_PROD
  }

  test('create new checkout', async () => {
    const paymentService = new PaymentService({
      apiKey: apiCredentials.APIKey,
      environment: Environment.Production
    })

    const response = await paymentService.createCheckout({
      price: '66',
      currency: 'USD',
      supported_assets: ['SOL:1399811149', 'USDC:1399811149', 'ETH:8453', 'ETH:1', 'USDC:1'],
      description: 'Access to premium features and exclusive content.',
      success_url: 'https://example.com/payment/success',
      cancel_url: 'https://example.com/payment/cancel',
      product_id: '4c57fae9-1a54-4a1b-9d94-00d5b4a3e1d2',
      customer_id: 'bc5bd50d-265e-4ea9-b312-bd8de5118683',
      order_id: 'bc5bd50d-265e-4ea9-b312-bd8de5118683',
      enable_localization: false,
      destination_wallet_id: '44651c57-b5f6-47f2-8688-fff633490a96',
      expiry_duration_seconds: 3600
    })

    console.log('Response', response)

    const checkout = await paymentService.getCheckout(response.id)
    console.log('checkout', checkout)

    const payment = await paymentService.createCheckoutPayment(response.id, {
      pay_asset_id: checkout.supported_assets[0].id
    })
    console.log('payment', payment)

    const checkoutPayment = await paymentService.getCheckoutPayment(payment.id)
    console.log('checkout payment', checkoutPayment)
  })
})
