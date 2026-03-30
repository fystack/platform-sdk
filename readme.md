# Fystack Platform SDK

A TypeScript SDK for Fystack's wallet and payment services, providing seamless integration with EVM, Solana, and Tron blockchains.

## Installation

```bash
npm install @fystack/sdk
```

## Quick Start

```typescript
import { FystackSDK, Environment } from '@fystack/sdk'

// Find your workspace ID at https://app.fystack.io -> Developers -> API Key
const sdk = new FystackSDK({
  credentials: {
    apiKey: 'YOUR_API_KEY',
    apiSecret: 'YOUR_API_SECRET'
  },
  workspaceId: 'YOUR_WORKSPACE_ID',
  environment: Environment.Production,
  debug: true // Enable debug logging
})
```

### Self-Hosted

For customers running their own Fystack instance, provide your custom domain instead of an environment:

```typescript
import { FystackSDK } from '@fystack/sdk'

const sdk = new FystackSDK({
  credentials: {
    apiKey: 'YOUR_API_KEY',
    apiSecret: 'YOUR_API_SECRET'
  },
  workspaceId: 'YOUR_WORKSPACE_ID',
  domain: 'api.your-company.com',
  debug: true
})
```

> When `domain` is provided, it takes priority over `environment`. The SDK will connect to `https://<domain>/api/v1`.

## Create Wallet

Fystack supports two wallet types:

- **Hyper** — Instantly created wallet. No async provisioning needed.
- **MPC** — Multi-Party Computation wallet with distributed key management. Creation is async and requires polling for status.

### Hyper Wallet

```typescript
import { WalletType, WalletPurpose } from '@fystack/sdk'

const wallet = await sdk.createWallet({
  name: 'Treasury Wallet',
  walletType: WalletType.Hyper,
  walletPurpose: WalletPurpose.General
})

console.log('Wallet ID:', wallet.wallet_id)
```

### MPC Wallet

MPC wallets are provisioned asynchronously. By default, `createWallet` waits for provisioning to complete before returning:

```typescript
const wallet = await sdk.createWallet({
  name: 'MPC Wallet',
  walletType: WalletType.MPC,
  walletPurpose: WalletPurpose.General
})

console.log('Wallet ID:', wallet.wallet_id)
console.log('Status:', wallet.status) // 'success' or 'error'
```

To return immediately and poll status manually:

```typescript
const wallet = await sdk.createWallet(
  { name: 'MPC Wallet', walletType: WalletType.MPC },
  false // don't wait for completion
)

// Poll status every 2 seconds until provisioned
const interval = setInterval(async () => {
  const status = await sdk.getWalletCreationStatus(wallet.wallet_id)
  console.log('Status:', status.status)

  if (status.status === 'success' || status.status === 'error') {
    clearInterval(interval)
  }
}, 2000)
```

## Get Deposit Address

Retrieve deposit addresses for a specific wallet and address type.

```typescript
import { AddressType } from '@fystack/sdk'

// Get EVM deposit address
const evm = await sdk.getDepositAddress(wallet.wallet_id, AddressType.Evm)
console.log('EVM Address:', evm.address)

// Get Solana deposit address
const sol = await sdk.getDepositAddress(wallet.wallet_id, AddressType.Solana)
console.log('Solana Address:', sol.address)

// Get Tron deposit address
const tron = await sdk.getDepositAddress(wallet.wallet_id, AddressType.Tron)
console.log('Tron Address:', tron.address)
```

## Create Withdrawal

Request a withdrawal from a wallet to an external address. You can identify the asset either by `assetId` or by `asset` symbol + `network` code.

### By asset and network (recommended)

```typescript
const withdrawal = await sdk.requestWithdrawal('WALLET_ID', {
  asset: 'ETH',
  network: 'ETHEREUM_MAINNET',
  amount: '10.5',
  recipientAddress: '0xRecipientAddress',
  notes: 'Monthly payout'
})

console.log('Auto approved:', withdrawal.auto_approved)
console.log('Withdrawal ID:', withdrawal.withdrawal.id)
console.log('Status:', withdrawal.withdrawal.status)
```

### By asset ID

```typescript
const withdrawal = await sdk.requestWithdrawal('WALLET_ID', {
  assetId: 'ASSET_UUID',
  amount: '10.5',
  recipientAddress: '0xRecipientAddress',
  notes: 'Monthly payout'
})
```

## Create Onchain Transaction

Sign and broadcast transactions directly on EVM or Solana networks using the built-in signers.

### EVM (Ethereum, Polygon, BSC, etc.)

```typescript
import { EtherSigner, Environment } from '@fystack/sdk'
import { JsonRpcProvider, ethers } from 'ethers'

const signer = new EtherSigner(
  { apiKey: 'YOUR_API_KEY', apiSecret: 'YOUR_API_SECRET' },
  Environment.Production
)

// Set the wallet to sign with
signer.setWallet('WALLET_ID')

// Connect to a provider and send a transaction
const provider = new JsonRpcProvider('YOUR_RPC_ENDPOINT')
const connectedSigner = signer.connect(provider)

const tx = await connectedSigner.sendTransaction({
  to: '0xRecipientAddress',
  value: ethers.parseEther('0.01')
})

console.log('Transaction hash:', tx.hash)
```

### Solana

```typescript
import { SolanaSigner, Environment } from '@fystack/sdk'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'

const signer = new SolanaSigner(
  { apiKey: 'YOUR_API_KEY', apiSecret: 'YOUR_API_SECRET' },
  Environment.Production
)

const fromAddress = await signer.getAddress()
const fromPubkey = new PublicKey(fromAddress)
const toPubkey = new PublicKey('RECIPIENT_SOLANA_ADDRESS')

const connection = new Connection('https://api.mainnet-beta.solana.com/')
const { blockhash } = await connection.getLatestBlockhash({ commitment: 'finalized' })

const transaction = new Transaction().add(
  SystemProgram.transfer({ fromPubkey, toPubkey, lamports: 1_000_000 })
)
transaction.recentBlockhash = blockhash
transaction.feePayer = fromPubkey

const serialized = transaction
  .serialize({ requireAllSignatures: false, verifySignatures: false })
  .toString('base64')

const signature = await signer.signTransaction(serialized)
console.log('Transaction signature:', signature)
```

## Sweep Task

Automatically consolidate funds from multiple wallets into a central destination wallet on a recurring schedule.

```typescript
import { SweepStrategy, SweepType, DestinationType } from '@fystack/sdk'

const task = await sdk.automation.createSweepTask({
  name: 'Daily Consolidation',
  strategy: SweepStrategy.Periodic,
  frequencyInSeconds: 86400, // every 24 hours
  minTriggerValueUsd: 50, // only sweep if wallet holds >= $50
  destinationWalletId: 'CENTRAL_WALLET_UUID',
  destinationType: DestinationType.InternalWallet,
  walletIds: [
    'WALLET_UUID_1',
    'WALLET_UUID_2',
    'WALLET_UUID_3'
  ],
  // Optional: only sweep specific assets
  assetIds: ['ASSET_UUID_1', 'ASSET_UUID_2'],
  // Optional: keep a reserve in each source wallet
  reserveType: ReserveType.FixedUsd,
  reserveAmountUsd: 10 // keep $10 in each wallet
})

console.log('Sweep task ID:', task.id)
console.log('Enabled:', task.enabled)
```

## Webhook Verification

Verify incoming webhook signatures to ensure authenticity.

```typescript
import { APIService, Environment } from '@fystack/sdk'

const apiService = new APIService(
  { apiKey: 'YOUR_API_KEY', apiSecret: 'YOUR_API_SECRET' },
  Environment.Production
)

const isValid = await apiService.Webhook.verifyEvent(event, signature)
```

## Payment Processing

Create checkouts and process crypto payments. You can specify accepted assets using `accepted_assets` (asset symbol + network code) or the legacy `supported_assets` format.

```typescript
import { PaymentService, Environment } from '@fystack/sdk'

const paymentService = new PaymentService({
  apiKey: 'YOUR_API_KEY',
  environment: Environment.Production
})

const checkout = await paymentService.createCheckout({
  price: '10.50',
  currency: 'USD',
  accepted_assets: [
    { asset: 'SOL', network: 'SOL_MAINNET' },
    { asset: 'ETH', network: 'ETHEREUM_MAINNET' },
    { asset: 'ETH', network: 'BASE_MAINNET' },
  ],
  description: 'Premium subscription',
  success_url: 'https://yourapp.com/success',
  cancel_url: 'https://yourapp.com/cancel',
  destination_wallet_id: 'YOUR_WALLET_ID',
  expiry_duration_seconds: 3600
})

console.log('Checkout URL:', checkout.id)
```

### Self-Hosted

```typescript
import { PaymentService } from '@fystack/sdk'

const paymentService = new PaymentService({
  apiKey: 'YOUR_API_KEY',
  domain: 'api.your-company.com'
})
```
