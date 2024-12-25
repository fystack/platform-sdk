import hmac from 'js-crypto-hmac'
import jseu from 'js-encoding-utils'
import { WebhookEvent } from './types'

export async function computeHMAC(
  apiSecret: string,
  params: Record<string, string>
): Promise<string> {
  const secret: Uint8Array = jseu.encoder.stringToArrayBuffer(apiSecret)
  const encodedParams = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  const data: Uint8Array = jseu.encoder.stringToArrayBuffer(encodedParams)
  const digest: Uint8Array = await hmac.compute(secret, data, 'SHA-256')
  const digestHex: string = jseu.encoder.arrayBufferToHexString(digest)
  return digestHex
}

export async function computeHMACForWebhook(
  apiSecret: string,
  event: WebhookEvent
): Promise<string> {
  const eventStr = canonicalizeJSON(event)
  console.log('eventStr', eventStr)
  const secret: Uint8Array = jseu.encoder.stringToArrayBuffer(apiSecret)
  const digest = await hmac.compute(secret, jseu.encoder.stringToArrayBuffer(eventStr), 'SHA-256')
  return jseu.encoder.arrayBufferToHexString(digest)
}

/**
 * Canonicalizes a TypeScript object by sorting its keys recursively.
 *
 * @param inputObject - The input object to canonicalize.
 * @returns A canonicalized JSON string with sorted keys.
 * @throws Error if the input is not a valid object.
 */
export function canonicalizeJSON(inputObject: Record<string, any>): string {
  if (typeof inputObject !== 'object' || inputObject === null) {
    throw new Error('Input must be a non-null object.')
  }

  /**
   * Recursively sorts the keys of an object or processes arrays.
   *
   * @param value - The value to sort (can be an object, array, or primitive).
   * @returns The sorted value.
   */
  const sortKeys = (value: any): any => {
    if (Array.isArray(value)) {
      // Recursively sort each element in the array
      return value.map(sortKeys)
    }

    if (value && typeof value === 'object' && value.constructor === Object) {
      // Sort object keys and recursively sort their values
      return Object.keys(value)
        .sort()
        .reduce((sortedObj: Record<string, any>, key: string) => {
          sortedObj[key] = sortKeys(value[key])
          return sortedObj
        }, {})
    }

    // Return primitive values as-is
    return value
  }

  // Sort the keys recursively
  const sortedObject = sortKeys(inputObject)

  // Convert the sorted object back into a JSON string
  return JSON.stringify(sortedObject)
}
