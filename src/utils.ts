import hmac from 'js-crypto-hmac'
import jseu from 'js-encoding-utils'

interface HMACParams {
  method: string
  path: string
  timestamp: number
  body: string
}

export async function computeHMAC(apiSecret: string, params: HMACParams): Promise<string> {
  const secret: Uint8Array = jseu.encoder.stringToArrayBuffer(apiSecret)
  const encodedParams = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  const data: Uint8Array = jseu.encoder.stringToArrayBuffer(encodedParams)
  const digest: Uint8Array = await hmac.compute(secret, data, 'SHA-256')
  const digestHex: string = jseu.encoder.arrayBufferToHexString(digest)
  return digestHex
}
