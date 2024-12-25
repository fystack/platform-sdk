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

export interface CreateCheckoutResponse {
  success: boolean
  message: string
  code: number
  data: {
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
}
