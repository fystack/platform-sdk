import { SweepTaskParams } from './api'
import {
  TxApprovalStatus,
  TxStatus,
  WalletCreationStatus,
  WalletPurpose,
  WalletRole,
  WalletType
} from './enum'

export class TransactionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly transactionId?: string,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'TransactionError'
  }
}

export interface APICredentials {
  apiKey: string
  apiSecret: string

  // Optional
  authToken?: string
  idempotencyKey?: string
}

export interface WebhookEvent {
  webhook_id: string // Equivalent to "webhook_id" in Go struct
  resource_id: string // Equivalent to "resource_id" in Go struct
  url: string // URL where the webhook was triggered
  payload: any // Binary or string representation of the payload
  event: string // Name of the event
}

export interface SignRequestParams {
  method: string
  message: string
  chain_id: number
  typed_data?: string
}

export interface SignResponse {
  transaction_id: string
}

export interface SignatureStatusResponse {
  status: TxStatus
  signature?: string
  transaction_id: string
  created_at: string
  updated_at: string
  approvals: Array<{
    user_id: string
    status: TxApprovalStatus
  }>
}

export interface ApprovalInfo {
  user_id: string
  status: TxApprovalStatus
}

export interface TransactionStatusResponse {
  transaction_id: string
  status: TxStatus
  method: string
  hash?: string
  created_at: string
  updated_at: string
  approvals: ApprovalInfo[]
  failed_reason?: string
}

export interface CreateWalletOptions {
  name: string
  walletType: WalletType
  walletPurpose?: WalletPurpose
  sweepTaskParams?: SweepTaskParams
  sweepTaskId?: string
}

export interface CreateWalletResponse {
  wallet_id: string
  status: WalletCreationStatus
}

export interface WalletCreationStatusResponse {
  wallet_id: string
  status: WalletCreationStatus
}

export interface WalletAssetNetwork {
  id: string
  created_at: string
  updated_at: string
  name: string
  description?: string
  is_evm: boolean
  chain_id: number
  native_currency: string
  is_testnet?: boolean
  internal_code: string
  explorer_tx: string
  explorer_address: string
  explorer_token: string
  confirmation_blocks: number
  block_interval_in_seconds: number
  disabled: boolean
  logo_url: string
}

export interface WalletAssetDetail {
  id: string
  created_at: string
  updated_at: string
  name: string
  symbol: string
  decimals: number
  logo_url: string
  is_native: boolean
  address_type: string
  is_whitelisted: boolean
  address?: string
  network_id: string
  network?: WalletAssetNetwork
}

export interface WalletAsset {
  id: string
  created_at: string
  updated_at: string
  wallet_id: string
  asset_id: string
  deposit_address: string
  hidden: boolean
  asset: WalletAssetDetail
}

export interface DepositAddressResponse {
  asset_id?: string
  address: string
  qr_code: string
}

export interface RescanTransactionParams {
  txHash: string
  networkId: string
}

export interface WalletResponse {
  id: string
  name: string
  value_usd: string
  role: WalletRole
}

export interface TopAssets {
  symbol: string
  logo_url: string
}

export interface WalletByWorkspaceResponse {
  id: string
  name: string
  role: string
  wallet_type: string
  value_usd: string
  top_assets: TopAssets[]
  wallet_purpose: string
}
