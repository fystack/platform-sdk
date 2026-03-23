import { SweepTaskParams } from './api'
import {
  DestinationType,
  ReserveType,
  SweepStrategy,
  SweepType,
  TxApprovalStatus,
  TxStatus,
  WalletCreationStatus,
  WalletPurpose,
  WalletRole,
  WalletType,
  WithdrawalStatus
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

export interface RequestWithdrawalParams {
  assetId: string
  amount: string
  recipientAddress: string
  notes?: string
  skipBalanceCheck?: boolean
}

export interface WithdrawalApproval {
  id: string
  user_id: string
  status: string
  created_at: string
  updated_at: string
}

export interface WithdrawalTransaction {
  id: string
  hash?: string
  status: string
  created_at: string
  updated_at: string
}

export interface TxCategory {
  id: string
  name: string
}

export interface Withdrawal {
  id: string
  created_at: string
  updated_at: string
  amount: string
  status: WithdrawalStatus
  recipient_address: string
  notes?: string
  withdrawal_approvals: WithdrawalApproval[]
  creator_id: string
  asset_id: string
  asset?: WalletAssetDetail
  wallet_id: string
  transaction_id?: string
  transaction?: WithdrawalTransaction
  asset_hold_id: string
  error_reason?: string
  categories?: TxCategory[]
}

export interface RequestWithdrawalResponse {
  auto_approved: boolean
  withdrawal: Withdrawal
}

export interface WebhookPublicKeyResponse {
  public_key: string // base64 encoded ed25519 public key
}

export interface CreateSweepTaskParams {
  /** Display name for the sweep task */
  name: string
  /** Sweep execution strategy */
  strategy: SweepStrategy
  /** Minimum USD value in a wallet to trigger a sweep */
  minTriggerValueUsd: number
  /** UUID of the destination wallet or address book record that receives swept funds */
  destinationWalletId: string
  /** How often (in seconds) the sweep task checks wallet balances */
  frequencyInSeconds: number
  /** List of wallet UUIDs to sweep from */
  walletIds: string[]
  /** Type of sweep task. Defaults to "default" */
  sweepType?: SweepType
  /** Whether the destination is an internal wallet or an address book entry. Defaults to "internal_wallet" */
  destinationType?: DestinationType
  /** Optional list of specific asset UUIDs to sweep. If omitted, all assets are swept */
  assetIds?: string[]
  /** Reserve strategy type (e.g. keep a fixed USD amount in the source wallet) */
  reserveType?: ReserveType
  /** Fixed USD amount to reserve in each source wallet (used when reserveType is "fixed_usd") */
  reserveAmountUsd?: number
  /** Percentage of USD value to reserve in each source wallet */
  reservePercentageUsd?: number
  /** Whether the task is enabled. Defaults to true */
  enabled?: boolean
}

export interface SweepTaskResponse {
  id: string
  created_at: string
  updated_at: string
  name: string
  workspace_id: string
  strategy: string
  min_trigger_value_usd: string
  destination_wallet_id: string
  frequency_in_seconds: number
  gas_tank_wallet_id: string
  last_executed_at: string | null
  is_executing: boolean
  enabled: boolean
  created_by_user_id: string
  sweep_type: string
  destination_type: string
  deviation_rate: string
  reserve_type?: string
  reserve_amount_usd?: string
  reserve_percentage_usd?: string
}
