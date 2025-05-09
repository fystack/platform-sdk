export interface Network {
  id: string
  created_at: string
  updated_at: string
  name: string
  description: string
  is_evm: boolean
  chain_id: number
  native_currency: string
  is_testnet: boolean
  internal_code: string
  explorer_tx: string
  explorer_address: string
  explorer_token: string
  confirmation_blocks: number
  block_interval_in_seconds: number
  disabled: boolean
  logo_url: string
}

export interface Asset {
  id: string
  created_at: string
  updated_at: string
  name: string
  symbol: string
  decimals: number
  logo_url: string
  is_native: boolean
  address_type: 'evm'
  is_whitelisted: boolean
  address?: string
  network_id: string
  network?: Network
}
export interface CreateCheckoutPayload {
  price: string
  currency: string
  supported_assets: string[]
  underpaid_cover_percent?: number
  description?: string
  success_url?: string
  cancel_url?: string
  product_id?: string
  customer_id?: string
  order_id?: string
  enable_localization?: boolean
  destination_wallet_id: string
  from_address?: string
  expiry_duration_seconds: number
}

/**
 * Represents the payload required to create a checkout payment.
 */
export interface CreateCheckoutPaymentPayload {
  /**
   * Customer's email address.
   *
   * - This field is **optional**.
   * - If provided, it must be a valid email format.
   */
  customer_email?: string

  /**
   * Unique identifier of the asset used for payment.
   *
   * - This field is **required**.
   * - Must be a **UUIDv4**.
   */
  pay_asset_id: string
}

export interface CreateCheckoutResponse {
  id: string
  created_at: string
  updated_at: string
  currency: string
  product_id: string
  order_id: string
  workspace_id: string
  underpaid_cover_percent: number
  description: string
  price: string
  supported_assets: Array<{
    id: string
    created_at: string
    updated_at: string
    is_native: boolean
    is_whitelisted: boolean
  }>
  customer_id: string
  expiry_duration_seconds: number
  enable_localization: boolean
  success_url: string
  cancel_url: string
  status: string
  outcome: any
  from_address: string
}

export enum PaymentStatus {
  Pending = 'Pending',
  Confirming = 'Confirming',
  Success = 'Success'
}

export interface SupportedAsset {
  id: string
  created_at: string
  updated_at: string
  name: string
  symbol: string
  decimals: number
  logo_url: string
  is_native: boolean
  address_type: 'evm'
  is_whitelisted: boolean
  address?: string
  network_id: string
  network: {
    id: string
    created_at: string
    updated_at: string
    name: string
    description: string
    is_evm: boolean
    chain_id: number
    native_currency: string
    is_testnet: boolean
    internal_code: string
    explorer_tx: string
    explorer_address: string
    explorer_token: string
    confirmation_blocks: number
    block_interval_in_seconds: number
    disabled: boolean
    logo_url: string
  }
}

export interface GetCheckoutResponse {
  id: string
  created_at: string
  updated_at: string
  currency: string
  product_id: string
  order_id: string
  workspace_id: string
  underpaid_cover_percent: number
  description: string
  price: string
  supported_assets: SupportedAsset[]
  customer_id: string
  expiry_duration_seconds: number
  enable_localization: boolean
  success_url: string
  cancel_url: string
  status: PaymentStatus
  outcome?: string | null
  from_address: string
}

/**
 * Represents the response structure for a checkout payment.
 */
export interface CreateCheckoutPaymentResponse {
  /**
   * Unique identifier of the payment.
   */
  id: string

  /**
   * Timestamp when the payment was created (ISO 8601 format).
   */
  created_at: string

  /**
   * Timestamp when the payment was last updated (ISO 8601 format).
   */
  updated_at: string

  /**
   * Unique identifier of the associated checkout.
   */
  checkout_id: string

  /**
   * Details of the associated checkout (if available).
   * Can be `null` if no data is linked.
   */
  checkout: any | null // Replace `any` with the actual Checkout type if available

  /**
   * Customer's email address (if provided).
   * Can be `null` if not available.
   */
  customer_email: string | null

  /**
   * Unique identifier of the asset used for payment.
   */
  pay_asset_id: string

  /**
   * Unique identifier of the blockchain network used for the transaction.
   */
  network_id: string

  /**
   * Details of the associated blockchain network (if available).
   * Can be `null` if no data is linked.
   */
  network: any | null // Replace `any` with the actual Network type if available

  /**
   * Timestamp when the payment expires (ISO 8601 format).
   */
  expired_at: string

  /**
   * Blockchain address of the payer (if available).
   * Can be `null` if not yet provided.
   */
  payer_address: string | null

  /**
   * Hash of the blockchain transaction (if completed).
   * Can be `null` if the transaction has not been broadcasted yet.
   */
  tx_hash: string | null

  /**
   * The amount of cryptocurrency required for the payment,
   * converted to the selected payment asset.
   */
  converted_crypto_price: string

  /**
   * The blockchain address where the customer should send the payment.
   */
  deposit_address: string

  /**
   * QR code (as a string) representing the deposit address for easy payment.
   * Could be an empty string if not generated.
   */
  deposit_qr: string
}

export interface GetCheckoutPaymentResponse {
  id: string
  created_at: string
  updated_at: string
  checkout_id: string
  checkout: GetCheckoutResponse
  customer_email?: string | null
  pay_asset_id: string
  pay_asset: Asset
  network_id: string
  network: Network
  expired_at: string
  payer_address?: string | null
  tx_hash?: string | null
  converted_crypto_price: string
  deposit_address: string
  deposit_qr: string
}
