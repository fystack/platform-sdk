# Fystack Platform SDK

A Typescript SDK for Fystack's wallet and payment services, providing seamless integration with both EVM and Solana blockchains.

## Installation

```bash
npm install @fystack/sdk
```

## Usage

### Wallet Management

Create and manage blockchain wallets with minimal code.

```typescript
import { FystackSDK } from '@fystack/sdk'
import { Environment, WalletType } from '@fystack/sdk'

// Initialize the SDK
const sdk = new FystackSDK({
  credentials: {
    apiKey: 'YOUR_API_KEY',
    apiSecret: 'YOUR_API_SECRET'
  },
  environment: Environment.Production,
  logger: true // Enable logging
})

const response = await sdk.createWallet({
  name: 'My Blockchain Wallet',
  walletType: WalletType.MPC // Multi-Party Computation wallet
})

console.log('Wallet ID:', response.wallet_id)
console.log('Status:', response.status)

// Check wallet creation status
const statusResponse = await sdk.getWalletCreationStatus(response.wallet_id)
console.log('WalletID:', statusResponse.wallet_id)
```

### Solana Transaction Signing

```typescript
import { SolanaSigner } from '@fystack/sdk'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'

async function signSolanaTransaction() {
  // Initialize the signer
  const signer = new SolanaSigner(
    {
      apiKey: 'YOUR_API_KEY',
      apiSecret: 'YOUR_API_SECRET'
    },
    Environment.Production
  )

  // Get signer's address
  const fromAddress = await signer.getAddress()
  const fromPubkey = new PublicKey(fromAddress)

  // Set recipient address
  const toAddress = 'RECIPIENT_SOLANA_ADDRESS'
  const toPubkey = new PublicKey(toAddress)

  // Connect to Solana network
  const connection = new Connection('https://api.mainnet-beta.solana.com/')

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash({
    commitment: 'finalized'
  })

  // Create transfer instruction
  const transferInstruction = SystemProgram.transfer({
    fromPubkey,
    toPubkey,
    lamports: 1000 // 0.000001 SOL
  })

  // Create and setup transaction
  const transaction = new Transaction().add(transferInstruction)
  transaction.recentBlockhash = blockhash
  transaction.feePayer = fromPubkey

  // Serialize the transaction to base64
  const serializedTransaction = transaction
    .serialize({
      requireAllSignatures: false,
      verifySignatures: false
    })
    .toString('base64')

  // Sign the transaction
  const signature = await signer.signTransaction(serializedTransaction)
  console.log('Transaction signature:', signature)

  return signature
}
```

### Ethereum Transaction Signing

```typescript
import { EtherSigner } from '@fystack/sdk'
import { JsonRpcProvider, ethers } from 'ethers'

async function signEthereumTransaction() {
  const address = await signer.getAddress()
  console.log('Wallet address:', address)

  // Connect to a provider
  const provider = new JsonRpcProvider('YOUR_RPC_ENDPOINT')
  const signerWithProvider = signer.connect(provider)

  // Send a transaction
  const tx = await signerWithProvider.sendTransaction({
    to: '0xRecipientAddress',
    value: ethers.parseEther('0.0001') // Amount in ETH
  })

  console.log('Transaction hash:', tx.hash)
  return tx.hash
}
```

### Payment Processing

Create checkouts and process payments.

```typescript
import { PaymentService } from '@fystack/sdk'
import { Environment } from '@fystack/sdk'

async function createPaymentCheckout() {
  const paymentService = new PaymentService({
    apiKey: 'YOUR_API_KEY',
    environment: Environment.Production
  })

  // Create a checkout
  const response = await paymentService.createCheckout({
    price: '10.50',
    currency: 'USD',
    supported_assets: [
      'SOL:1399811149', // Format: "ASSET:CHAIN_ID"
      'USDC:1399811149'
    ],
    description: 'Premium subscription package',
    success_url: 'https://yourapp.com/payment/success',
    cancel_url: 'https://yourapp.com/payment/cancel',
    product_id: 'YOUR_PRODUCT_ID',
    customer_id: 'YOUR_CUSTOMER_ID',
    order_id: 'YOUR_ORDER_ID',
    enable_localization: false,
    destination_wallet_id: 'YOUR_DESTINATION_WALLET_ID',
    expiry_duration_seconds: 3600 // 1 hour
  })

  console.log('Checkout created:', response.id)

  // Get checkout details
  const checkout = await paymentService.getCheckout(response.id)

  // Create payment using the first supported asset
  const payment = await paymentService.createCheckoutPayment(response.id, {
    pay_asset_id: checkout.supported_assets[0].id
  })

  console.log('Payment created:', payment.id)
  console.log('Send payment to:', payment.deposit_address)

  // Get payment status
  const paymentStatus = await paymentService.getCheckoutPayment(payment.id)
  console.log('Payment status:', paymentStatus)

  return payment
}
```

### Webhook Verification

```typescript
import { APIService } from '@fystack/sdk'

function verifyWebhook(event, signature) {
  const apiService = new APIService(
    {
      apiKey: 'YOUR_API_KEY',
      apiSecret: 'YOUR_API_SECRET'
    },
    Environment.Production
  )

  const isValid = apiService.Webhook.verifyEvent(event, signature)
  return isValid
}
```
