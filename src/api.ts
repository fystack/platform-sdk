import fetch from 'cross-fetch'
import { APIConfig, Environment, createAPI } from './config'
import { computeHMAC, computeHMACForWebhook } from './utils'
import {
  APICredentials,
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
  WalletByWorkspaceResponse
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
}

export interface PaymentServiceParams {
  apiKey: string
  environment: Environment
}

async function composeAPIHeaders(
  credentials: APICredentials,
  httpMethod: string,
  apiEndpoint: string,
  body: Record<string, any> = {}
): Promise<Record<string, string>> {
  if (!credentials.apiSecret || credentials.apiSecret === '') {
    // If APISecret is not provided, use authToken
    if (credentials.authToken) {
      return {
        Authorization: credentials.authToken
      }
    }
    // fallback to cookie mode with no headers
    return {}
  }

  const currentTimestampInSeconds = Math.floor(Date.now() / 1000)
  const url = new URL(apiEndpoint)
  const path = url.pathname // Extract the path
  const params: HMACParams = {
    method: httpMethod,
    path,
    timestamp: String(currentTimestampInSeconds),
    body: Object.keys(body).length ? JSON.stringify(body) : ''
  }

  const digest = await computeHMAC(credentials.apiSecret, params as Record<string, any>)

  const headers = {
    'ACCESS-API-KEY': credentials.apiKey,
    'ACCESS-TIMESTAMP': String(currentTimestampInSeconds),
    'ACCESS-SIGN': btoa(digest) // convert to base64
  }

  return headers
}

export class APIService {
  private credentials!: APICredentials
  public Webhook: WebhookService
  private API: APIConfig

  constructor(credentials: APICredentials, environment: Environment) {
    this.credentials = credentials
    this.Webhook = new WebhookService(credentials)
    this.API = createAPI(environment)
  }

  async getWallets(workspaceId: string): Promise<WalletByWorkspaceResponse[]> {
    const endpoint = this.API.endpoints.getWallets(workspaceId)
    const headers = await composeAPIHeaders(this.credentials, 'GET', endpoint)
    const response = await get(endpoint, headers)
    return response.data
  }

  async getWalletDetail(addressType = AddressType.Evm, walletId?: string): Promise<WalletDetail> {
    const endpoint = this.API.endpoints.getWalletDetail(walletId)
    const headers = await composeAPIHeaders(this.credentials, 'GET', endpoint)
    console.info('headers', headers)
    const resp = await get(endpoint + `?address_type=${addressType}`, headers)
    return transformWalletDetail(resp.data)
  }

  async requestSign(walletId: string, params: SignRequestParams): Promise<SignResponse> {
    const endpoint = this.API.endpoints.requestSign(walletId)
    const headers = await composeAPIHeaders(this.credentials, 'POST', endpoint, params)
    const response = await post(endpoint, params, headers)
    return response.data
  }

  async getSignStatus(walletId: string, transactionId: string): Promise<SignatureStatusResponse> {
    const endpoint = this.API.endpoints.getSignStatus(walletId, transactionId)
    const headers = await composeAPIHeaders(this.credentials, 'GET', endpoint)
    const response = await get(endpoint, headers)
    return response.data
  }

  async signTransaction(walletId: string, body: Record<string, any>): Promise<SignResponse> {
    const startTime = Date.now()
    const endpoint = this.API.endpoints.signTransaction(walletId)
    const headers = await composeAPIHeaders(this.credentials, 'POST', endpoint, body)
    const response = await post(endpoint, body, headers)
    const elapsedTime = Date.now() - startTime

    console.log(`[WalletSDK] Sign transaction completed in ${elapsedTime}ms`)
    console.log('[WalletSDK] Sign transaction response:', response)

    return response.data
  }

  async getTransactionStatus(
    walletId: string,
    transactionId: string
  ): Promise<TransactionStatusResponse> {
    const endpoint = this.API.endpoints.getTransactionStatus(walletId, transactionId)
    const headers = await composeAPIHeaders(this.credentials, 'GET', endpoint)
    const response = await get(endpoint, headers)
    return response.data
  }

  async createWallet(payload: CreateWalletPayload): Promise<CreateWalletResponse> {
    const endpoint = this.API.endpoints.createWallet()
    const transformedPayload = transformCreateWalletPayload(payload)
    const headers = await composeAPIHeaders(this.credentials, 'POST', endpoint, transformedPayload)
    const resp = await post(endpoint, transformedPayload, headers)
    return resp.data
  }

  async createCheckout(payload: CreateCheckoutPayload): Promise<CreateCheckoutResponse> {
    const endpoint = this.API.endpoints.createCheckout()
    const headers = await composeAPIHeaders(this.credentials, 'POST', endpoint, payload)
    const response = await post(endpoint, payload, headers)
    return response.data
  }

  async getWalletCreationStatus(walletId: string): Promise<WalletCreationStatusResponse> {
    const endpoint = this.API.endpoints.getWalletCreationStatus(walletId)
    const headers = await composeAPIHeaders(this.credentials, 'GET', endpoint)
    const response = await get(endpoint, headers)
    return response.data
  }

  async getWalletAssets(walletId: string): Promise<WalletAsset[]> {
    const endpoint = this.API.endpoints.getWalletAssets(walletId)
    const headers = await composeAPIHeaders(this.credentials, 'GET', endpoint)
    const response = await get(endpoint, headers)
    return response.data
  }

  /**
   * Gets deposit address for a wallet by address type
   * @param walletId The wallet ID
   * @param addressType The type of address (evm, sol)
   * @returns Deposit address response
   */
  async getDepositAddress(
    walletId: string,
    addressType: AddressType
  ): Promise<DepositAddressResponse> {
    const endpoint = this.API.endpoints.getDepositAddress(walletId, addressType)
    const headers = await composeAPIHeaders(this.credentials, 'GET', endpoint)
    const response = await get(endpoint, headers)
    return response.data
  }

  /**
   * Rescans a transaction on a specific network
   * @param params Transaction hash and network ID
   * @returns API response
   */
  async rescanTransaction(params: RescanTransactionParams): Promise<void> {
    const endpoint = this.API.endpoints.rescanTransaction()
    const transformedParams = transformRescanTransactionParams(params)
    const headers = await composeAPIHeaders(this.credentials, 'POST', endpoint, transformedParams)
    await post(endpoint, transformedParams, headers)
  }
}

export class PaymentService {
  private apiKey!: string
  private API: Record<string, any>

  constructor(params: PaymentServiceParams) {
    this.apiKey = params.apiKey
    this.API = createAPI(params.environment)
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

  async getCheckoutPayment(checkoutId: string): Promise<GetCheckoutPaymentResponse> {
    const endpoint = this.API.endpoints.getCheckoutPayment(checkoutId)
    const response = await get(endpoint)
    return response.data
  }
}

export class WebhookService {
  private credentials!: APICredentials

  constructor(credentials: APICredentials) {
    this.credentials = credentials
  }

  // Implement verify webhook here
  async verifyEvent(event: WebhookEvent, signature: string): Promise<boolean> {
    // Recompute HMAC
    const computedHMAC = await computeHMACForWebhook(this.credentials.apiSecret, event)
    const isValid = signature === computedHMAC
    return isValid
  }
}

// Simplified GET request function
export async function get(
  endpoint: string,
  headers: Record<string, string> = {}
): Promise<APIResponse> {
  const request: RequestInit = {
    method: 'GET',
    headers: {
      ...headers
    }
  }

  // Only include credentials if we're in cookie mode (no API key in headers)
  if (!headers['ACCESS-API-KEY']) {
    request.credentials = 'include'
  }

  const response = await fetch(`${endpoint}`, request)
  const data = await response.json()
  if (!response.ok || !data.success) {
    console.error('Status Code', response.status)
    throw new Error(data.message || 'Failed to fetch data')
  }

  return data
}

// Simplified POST request function
export async function post(
  endpoint: string,
  body: any,
  headers: Record<string, string> = {}
): Promise<APIResponse> {
  const request: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  }

  // Only include credentials if we're in cookie mode (no API key in headers)
  if (!headers['ACCESS-API-KEY']) {
    request.credentials = 'include'
  }

  const response = await fetch(`${endpoint}`, request)
  const data = await response.json()
  if (!response.ok || !data.success) {
    console.error('Status Code', response.status)
    throw new Error(data.message || 'Failed to fetch data')
  }

  return data
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
    ...(data.sweepTaskId !== undefined && { sweep_task_id: data.sweepTaskId })
  }
}

export function transformRescanTransactionParams(data: RescanTransactionParams) {
  return {
    tx_hash: data.txHash,
    network_id: data.networkId
  }
}

;(BigInt.prototype as any).toJSON = function () {
  return this.toString()
}
