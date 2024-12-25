import fetch from 'cross-fetch'
import config from './config'
import { computeHMAC, computeHMACForWebhook } from './utils'
import { APICredentials, WebhookEvent } from './types'
import { CreateCheckoutPayload, CreateCheckoutResponse } from './payment'

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

export enum WalletType {
  Standard = 'standard',
  MPC = 'mpc'
}

export interface CreateWalletPayload {
  WorkspaceID: string
  Name: string
  WalletType: WalletType
}

export interface CreateWalletResponse {
  wallet_id: string
}

async function composeAPIHeaders(
  credentials: APICredentials,
  httpMethod: string,
  apiEndpoint: string,
  body: Record<string, any> = {}
): Promise<Record<string, string>> {
  const currentTimestampInSeconds = Math.floor(Date.now() / 1000)
  const params: HMACParams = {
    method: httpMethod,
    path: apiEndpoint,
    timestamp: String(currentTimestampInSeconds),
    body: Object.keys(body).length ? JSON.stringify(body) : ''
  }
  const digest = await computeHMAC(credentials.APISecret, params as Record<string, any>)

  const headers = {
    'ACCESS-API-KEY': credentials.APIKey,
    'ACCESS-TIMESTAMP': String(currentTimestampInSeconds),
    'ACCESS-SIGN': btoa(digest) // convert to base64
  }

  return headers
}

export class APIService {
  private credentials!: APICredentials
  public Payment: PaymentService
  public Webhook: WebhookService

  constructor(credentials: APICredentials) {
    this.credentials = credentials
    this.Payment = new PaymentService(credentials)
    this.Webhook = new WebhookService(credentials)
  }

  async getWalletDetail(): Promise<WalletDetail> {
    const endpoint = config.API.endpoints.getWalletDetail()
    const headers = await composeAPIHeaders(this.credentials, 'GET', endpoint)
    const resp = await get(endpoint + '?address_type=evm', headers)
    return transformWalletDetail(resp.data)
  }

  async signTransaction(walletId: string, body: Record<string, any>): Promise<any> {
    const endpoint = config.API.endpoints.signTransaction(walletId)
    const headers = await composeAPIHeaders(this.credentials, 'POST', endpoint, body)
    await post(endpoint, body, headers)
  }

  async createWallet(payload: CreateWalletPayload): Promise<{ wallet_id: string }> {
    const endpoint = config.API.endpoints.createWallet()
    const transformedPayload = transformCreateWalletPayload(payload)
    const headers = await composeAPIHeaders(this.credentials, 'POST', endpoint, transformedPayload)
    const resp = await post(endpoint, transformedPayload, headers)
    return resp.data
  }

  async createCheckout(payload: CreateCheckoutPayload): Promise<CreateCheckoutResponse> {
    const endpoint = config.API.endpoints.createCheckout()
    const headers = await composeAPIHeaders(this.credentials, 'POST', endpoint, payload)
    const response = await post(endpoint, payload, headers)
    return response.data
  }
}

export class PaymentService {
  private credentials!: APICredentials

  constructor(credentials: APICredentials) {
    this.credentials = credentials
  }

  async createCheckout(payload: CreateCheckoutPayload): Promise<CreateWalletResponse> {
    const endpoint = config.API.endpoints.createCheckout()
    const headers = await composeAPIHeaders(this.credentials, 'POST', endpoint, payload)
    const response = await post(endpoint, payload, headers)
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
    const computedHMAC = await computeHMACForWebhook(this.credentials.APISecret, event)
    const isValid = signature === computedHMAC
    return isValid
  }
}

// Simplified GET request function
export async function get(
  endpoint: string,
  headers: Record<string, string> = {}
): Promise<APIResponse> {
  const response = await fetch(`${config.API.baseURL}${endpoint}`, {
    method: 'GET',
    headers: {
      ...headers
    }
  })
  const data = await response.json()
  if (!response.ok || !data.success) {
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
  const response = await fetch(`${config.API.baseURL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to post data')
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
    workspace_id: data.WorkspaceID,
    name: data.Name,
    wallet_type: data.WalletType
  }
}

;(BigInt.prototype as any).toJSON = function () {
  return this.toString()
}
