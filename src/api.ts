import fetch from 'cross-fetch'
import config from './config'
import { computeHMAC } from './utils'
import { APICredentials } from './types'

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

export class APIService {
  private credentials!: APICredentials

  constructor(credentials: APICredentials) {
    this.credentials = credentials
  }

  async composeAPIHeaders(
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
    console.info('params', params)
    const digest = await computeHMAC(this.credentials.APISecret, params as Record<string, any>)

    const headers = {
      'ACCESS-API-KEY': this.credentials.APIKey,
      'ACCESS-TIMESTAMP': String(currentTimestampInSeconds),
      'ACCESS-SIGN': btoa(digest) // convert to base64
    }

    return headers
  }

  async getWalletDetail(): Promise<WalletDetail> {
    const endpoint = config.API.endpoints.getWalletDetail()
    console.info('getWalletDetail', endpoint)
    const headers = await this.composeAPIHeaders('GET', endpoint)
    const resp = await get(endpoint + '?address_type=evm', headers)
    return transformWalletDetail(resp.data)
  }

  async signTransaction(walletId: string, body: Record<string, any>): Promise<any> {
    const endpoint = config.API.endpoints.signTransaction(walletId)
    const headers = await this.composeAPIHeaders('POST', endpoint, body)
    await post(endpoint, body, headers)
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

;(BigInt.prototype as any).toJSON = function () {
  return this.toString()
}
