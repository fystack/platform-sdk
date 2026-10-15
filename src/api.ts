import fetch from 'cross-fetch'
import { APIConfig, Environment, createAPI } from './config'
import { computeHMAC, verifyHMACForWebhook, buildCanonicalString, stringifyJSON } from './utils'
import {
  APIError,
  APICredentials,
  RequestOptions,
  WebhookEvent,
  SignRequestParams,
  SignResponse,
  SignatureStatusResponse,
  TransactionStatusResponse,
  CreateWalletResponse,
  WalletCreationStatusResponse,
  WalletAsset,
  DepositAddressResponse,
  RescanTransactionParams,
  WalletByWorkspaceResponse,
  RequestWithdrawalParams,
  RequestWithdrawalResponse,
  Withdrawal,
  WebhookPublicKeyResponse,
  CreateSweepTaskParams,
  SweepTaskResponse
} from './types'
import {
  CreateCheckoutPayload,
  CreateCheckoutPaymentPayload,
  CreateCheckoutPaymentResponse,
  CreateCheckoutResponse,
  GetCheckoutPaymentResponse,
  GetCheckoutResponse
} from './payment'
import { AddressType, DestinationType, WalletPurpose, WalletType } from './enum'

interface APIResponse {
  data: any
  success: boolean
  message?: string
}

export interface HMACParams {
  method: string
  path: string
  timestamp: string
  body?: string
}

export interface WalletDetail {
  APIKey: string
  WalletID: string
  Name: string
  AddressType: string
  Address: string
}

export interface SweepTaskParams {
  minTriggerValueUsd: number
  destinationWalletId: string
  destinationType: DestinationType
}

export interface CreateWalletPayload {
  name: string
  walletType: WalletType
  walletPurpose?: WalletPurpose
  sweepTaskParams?: SweepTaskParams
  sweepTaskId?: string
  networkIds?: string[]
  gasSponsorshipEnabled?: boolean
  approvalGroupId?: string
}

export interface PaymentServiceParams {
  apiKey: string
  environment?: Environment
  domain?: string
}

async function composeAPIHeaders(
  credentials: APICredentials,
  httpMethod: string,
  apiEndpoint: string,
  body: string = '',
  options?: RequestOptions
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}
  if (options?.idempotencyKey) {
    headers['X-Idempotency-Key'] = options.idempotencyKey
  }

  const hasSecret = credentials.apiSecret && credentials.apiSecret !== ''
  if (!credentials.signer && !hasSecret) {
    // Neither Ed25519 nor HMAC credentials provided, use authToken
    if (credentials.authToken) {
      headers.Authorization = credentials.authToken
    }
    // Otherwise fall back to cookie mode
    return headers
  }

  if (!credentials.apiKey || credentials.apiKey.trim() === '') {
    throw new Error('apiKey is required for signed requests')
  }

  const currentTimestampInSeconds = Math.floor(Date.now() / 1000)
  // Apex signs the decoded request path without the query string
  const path = decodeURIComponent(new URL(apiEndpoint).pathname)
  const params: HMACParams = {
    method: httpMethod,
    path,
    timestamp: String(currentTimestampInSeconds),
    body
  }

  const accessSign = credentials.signer
    ? await credentials.signer.sign(buildCanonicalString(params as Record<string, any>))
    : btoa(await computeHMAC(credentials.apiSecret!, params as Record<string, any>))

  return {
    ...headers,
    'ACCESS-API-KEY': credentials.apiKey,
    'ACCESS-TIMESTAMP': String(currentTimestampInSeconds),
    'ACCESS-SIGN': accessSign
  }
}

export class APIService {
  private credentials!: APICredentials
  public Webhook: WebhookService
  private API: APIConfig

  constructor(credentials: APICredentials, environment?: Environment, domain?: string) {
    this.credentials = credentials
    this.Webhook = new WebhookService(credentials)
    this.API = createAPI(environment, domain)
  }

  // Signs exactly the body bytes it sends.
  private async send(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: Record<string, any>,
    options?: RequestOptions
  ): Promise<APIResponse> {
    const bodyString = body === undefined ? undefined : stringifyJSON(body)
    const headers = await composeAPIHeaders(
      this.credentials,
      method,
      endpoint,
      bodyString ?? '',
      options
    )
    return request(method, endpoint, bodyString, headers)
  }

  async getWallets(workspaceId: string): Promise<WalletByWorkspaceResponse[]> {
    const response = await this.send('GET', this.API.endpoints.getWallets(workspaceId))
    return response.data
  }

  async getWalletDetail(addressType = AddressType.Evm, walletId?: string): Promise<WalletDetail> {
    const endpoint =
      this.API.endpoints.getWalletDetail(walletId) +
      `?address_type=${encodeURIComponent(addressType)}`
    const resp = await this.send('GET', endpoint)
    return transformWalletDetail(resp.data)
  }

  async requestSign(
    walletId: string,
    params: SignRequestParams,
    options?: RequestOptions
  ): Promise<SignResponse> {
    const endpoint = this.API.endpoints.requestSign(walletId)
    const response = await this.send('POST', endpoint, params, options)
    return response.data
  }

  async getSignStatus(walletId: string, transactionId: string): Promise<SignatureStatusResponse> {
    const endpoint = this.API.endpoints.getSignStatus(walletId, transactionId)
    const response = await this.send('GET', endpoint)
    return response.data
  }

  async signTransaction(
    walletId: string,
    body: Record<string, any>,
    options?: RequestOptions
  ): Promise<SignResponse> {
    const endpoint = this.API.endpoints.signTransaction(walletId)
    const response = await this.send('POST', endpoint, body, options)
    return response.data
  }

  async getTransactionStatus(
    walletId: string,
    transactionId: string
  ): Promise<TransactionStatusResponse> {
    const endpoint = this.API.endpoints.getTransactionStatus(walletId, transactionId)
    const response = await this.send('GET', endpoint)
    return response.data
  }

  async createWallet(payload: CreateWalletPayload): Promise<CreateWalletResponse> {
    const endpoint = this.API.endpoints.createWallet()
    const resp = await this.send('POST', endpoint, transformCreateWalletPayload(payload))
    return resp.data
  }

  async createCheckout(payload: CreateCheckoutPayload): Promise<CreateCheckoutResponse> {
    const endpoint = this.API.endpoints.createCheckout()
    const response = await this.send('POST', endpoint, payload)
    return response.data
  }

  async getWalletCreationStatus(walletId: string): Promise<WalletCreationStatusResponse> {
    const endpoint = this.API.endpoints.getWalletCreationStatus(walletId)
    const response = await this.send('GET', endpoint)
    return response.data
  }

  async getWalletAssets(walletId: string): Promise<WalletAsset[]> {
    const endpoint = this.API.endpoints.getWalletAssets(walletId)
    const response = await this.send('GET', endpoint)
    return response.data
  }

  /**
   * Gets deposit address for a wallet by address type
   * @param walletId The wallet ID
   * @param addressType The type of address (evm, btc, sol, tron)
   * @returns Deposit address response
   */
  async getDepositAddress(
    walletId: string,
    addressType: AddressType
  ): Promise<DepositAddressResponse> {
    const endpoint = this.API.endpoints.getDepositAddress(walletId, addressType)
    const response = await this.send('GET', endpoint)
    return response.data
  }

  /**
   * Gets the network-specific deposit address for an asset
   * @param walletId The wallet ID
   * @param assetId The asset ID
   * @returns Deposit address response
   */
  async getDepositAddressByAssetId(
    walletId: string,
    assetId: string
  ): Promise<DepositAddressResponse> {
    const endpoint = this.API.endpoints.getDepositAddressByAssetId(walletId, assetId)
    const response = await this.send('GET', endpoint)
    return response.data
  }

  /**
   * Rescans a transaction on a specific network
   * @param params Transaction hash and network ID
   * @returns API response
   */
  async rescanTransaction(params: RescanTransactionParams): Promise<void> {
    const endpoint = this.API.endpoints.rescanTransaction()
    await this.send('POST', endpoint, transformRescanTransactionParams(params))
  }

  /**
   * Requests a withdrawal from a wallet
   * @param walletId The wallet ID
   * @param params Withdrawal parameters
   * @param options Request options such as an idempotency key
   * @returns Withdrawal response with auto_approved status and withdrawal details
   */
  async requestWithdrawal(
    walletId: string,
    params: RequestWithdrawalParams,
    options?: RequestOptions
  ): Promise<RequestWithdrawalResponse> {
    const endpoint = this.API.endpoints.requestWithdrawal(walletId)
    const body = transformRequestWithdrawalParams(params)
    const response = await this.send('POST', endpoint, body, options)
    return response.data
  }

  /**
   * Gets the latest status/details for a withdrawal
   * @param walletId The wallet ID
   * @param withdrawalId The withdrawal ID
   * @returns Withdrawal details
   */
  async getWithdrawalStatus(walletId: string, withdrawalId: string): Promise<Withdrawal> {
    const endpoint = this.API.endpoints.getWithdrawalStatus(walletId, withdrawalId)
    const response = await this.send('GET', endpoint)
    return response.data
  }

  /**
   * Gets the webhook public key for a workspace
   * @param workspaceId The workspace ID
   * @returns Webhook public key response with hex encoded ed25519 public key
   */
  async getWebhookPublicKey(workspaceId: string): Promise<WebhookPublicKeyResponse> {
    const endpoint = this.API.endpoints.getWebhookPublicKey(workspaceId)
    const response = await this.send('GET', endpoint)
    return response.data
  }

  async createSweepTask(
    workspaceId: string,
    params: CreateSweepTaskParams
  ): Promise<SweepTaskResponse> {
    const endpoint = this.API.endpoints.createSweepTask(workspaceId)
    const response = await this.send('POST', endpoint, transformCreateSweepTaskParams(params))
    return response.data
  }
}

export class PaymentService {
  private apiKey!: string
  private API: APIConfig

  constructor(params: PaymentServiceParams) {
    this.apiKey = params.apiKey
    this.API = createAPI(params.environment, params.domain)
  }

  async createCheckout(payload: CreateCheckoutPayload): Promise<CreateCheckoutResponse> {
    const endpoint = this.API.endpoints.createCheckout()
    const headers = {
      'ACCESS-API-KEY': this.apiKey
    }
    const response = await post(endpoint, payload, headers)
    return response.data
  }

  async getCheckout(checkoutId: string): Promise<GetCheckoutResponse> {
    const endpoint = this.API.endpoints.getCheckout(checkoutId)
    const response = await get(endpoint)
    return response.data
  }

  async createCheckoutPayment(
    checkoutId: string,
    payload: CreateCheckoutPaymentPayload
  ): Promise<CreateCheckoutPaymentResponse> {
    const endpoint = this.API.endpoints.createCheckoutPayment(checkoutId)
    const response = await post(endpoint, payload)
    return response.data
  }

  async getCheckoutPayment(paymentId: string): Promise<GetCheckoutPaymentResponse> {
    const endpoint = this.API.endpoints.getCheckoutPayment(paymentId)
    const response = await get(endpoint)
    return response.data
  }
}

export class WebhookService {
  private credentials!: APICredentials

  constructor(credentials: APICredentials) {
    this.credentials = credentials
  }

  /**
   * Verifies the hex HMAC-SHA256 `X-Webhook-Signature` of a webhook event in constant time.
   */
  async verifyEvent(event: WebhookEvent, signature: string): Promise<boolean> {
    if (!this.credentials.apiSecret) {
      throw new Error('apiSecret is required to verify webhook events')
    }
    return verifyHMACForWebhook(this.credentials.apiSecret, event, signature)
  }
}

async function request(
  method: 'GET' | 'POST',
  endpoint: string,
  body: string | undefined,
  headers: Record<string, string>
): Promise<APIResponse> {
  const init: RequestInit = {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...headers
    }
  }
  if (body !== undefined) {
    init.body = body
  }

  // Only include credentials if we're in cookie mode (no API key in headers)
  if (!headers['ACCESS-API-KEY']) {
    init.credentials = 'include'
  }

  const response = await fetch(endpoint, init)
  if (response.status === 204) {
    return { data: undefined, success: true }
  }

  let data: APIResponse | undefined
  try {
    data = await response.json()
  } catch {
    data = undefined
  }
  if (!response.ok || !data?.success) {
    throw new APIError(
      data?.message || response.statusText || 'Failed to fetch data',
      response.status
    )
  }

  return data
}

// Simplified GET request function
export async function get(
  endpoint: string,
  headers: Record<string, string> = {}
): Promise<APIResponse> {
  return request('GET', endpoint, undefined, headers)
}

// Simplified POST request function
export async function post(
  endpoint: string,
  body: any,
  headers: Record<string, string> = {}
): Promise<APIResponse> {
  return request('POST', endpoint, stringifyJSON(body), headers)
}

export function transformWalletDetail(data: Record<string, string>): WalletDetail {
  return {
    APIKey: data?.ap_key,
    WalletID: data?.wallet_id,
    Name: data?.name,
    AddressType: data?.address_type,
    Address: data?.address
  }
}

export function transformCreateWalletPayload(data: CreateWalletPayload) {
  return {
    name: data.name,
    wallet_type: data.walletType,
    ...(data.walletPurpose !== undefined && { wallet_purpose: data.walletPurpose }),
    ...(data.sweepTaskParams !== undefined && {
      sweep_task_params: {
        min_trigger_value_usd: data.sweepTaskParams?.minTriggerValueUsd,
        destination_wallet_id: data.sweepTaskParams?.destinationWalletId,
        destination_type: data.sweepTaskParams?.destinationType
      }
    }),
    ...(data.sweepTaskId !== undefined && { sweep_task_id: data.sweepTaskId }),
    ...(data.networkIds !== undefined && { network_ids: data.networkIds }),
    ...(data.gasSponsorshipEnabled !== undefined && {
      gas_sponsorship_enabled: data.gasSponsorshipEnabled
    }),
    ...(data.approvalGroupId !== undefined && { approval_group_id: data.approvalGroupId })
  }
}

export function transformRescanTransactionParams(data: RescanTransactionParams) {
  return {
    tx_hash: data.txHash,
    network_id: data.networkId
  }
}

export function transformRequestWithdrawalParams(data: RequestWithdrawalParams) {
  return {
    ...(data.assetId !== undefined && { asset_id: data.assetId }),
    ...(data.network !== undefined && { network: data.network }),
    ...(data.asset !== undefined && { asset: data.asset }),
    amount: data.amount,
    recipient_address: data.recipientAddress,
    ...(data.notes !== undefined && { notes: data.notes }),
    ...(data.skipBalanceCheck !== undefined && { skip_balance_check: data.skipBalanceCheck }),
    ...(data.categoryIds !== undefined && { category_ids: data.categoryIds }),
    ...(data.feePriority !== undefined && { fee_priority: data.feePriority })
  }
}

export function transformCreateSweepTaskParams(data: CreateSweepTaskParams) {
  return {
    name: data.name,
    strategy: data.strategy,
    min_trigger_value_usd: data.minTriggerValueUsd,
    destination_wallet_id: data.destinationWalletId,
    frequency_in_seconds: data.frequencyInSeconds,
    wallet_ids: data.walletIds,
    ...(data.sweepType !== undefined && { sweep_type: data.sweepType }),
    ...(data.destinationType !== undefined && { destination_type: data.destinationType }),
    ...(data.assetIds !== undefined && { asset_ids: data.assetIds }),
    ...(data.reserveType !== undefined && { reserve_type: data.reserveType }),
    ...(data.reserveAmountUsd !== undefined && { reserve_amount_usd: data.reserveAmountUsd }),
    ...(data.reservePercentageUsd !== undefined && { reserve_percentage_usd: data.reservePercentageUsd }),
    ...(data.enabled !== undefined && { enabled: data.enabled })
  }
}
