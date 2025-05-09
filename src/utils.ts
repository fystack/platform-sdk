import CryptoJS from 'crypto-js'
import { WebhookEvent } from './types'

export async function computeHMAC(
  apiSecret: string,
  params: Record<string, string>
): Promise<string> {
  const encodedParams = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  const digest = CryptoJS.HmacSHA256(encodedParams, apiSecret)
  return digest.toString(CryptoJS.enc.Hex)
}

export async function computeHMACForWebhook(
  apiSecret: string,
  event: WebhookEvent
): Promise<string> {
  const eventStr = canonicalizeJSON(event)
  console.log('eventStr', eventStr)
  const digest = CryptoJS.HmacSHA256(eventStr, apiSecret)
  return digest.toString(CryptoJS.enc.Hex)
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

/**
 * Validates if a string is a valid UUID v4
 * @param uuid The string to validate
 * @returns boolean indicating if the string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false
  }

  // UUID v4 pattern:
  // 8-4-4-4-12 where third group starts with 4 and fourth group starts with 8, 9, a, or b
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidV4Regex.test(uuid)
}

/**
 * Validates if a string is a valid UUID and throws an error if not
 * @param uuid The string to validate
 * @param paramName The name of the parameter being validated (for error message)
 * @throws Error if the UUID is invalid
 */
export function validateUUID(uuid: string, paramName: string): void {
  if (!uuid || typeof uuid !== 'string') {
    throw new Error(`${paramName} is required and must be a string`)
  }

  if (!isValidUUID(uuid)) {
    throw new Error(`Invalid ${paramName} format. Must be a valid UUID v4`)
  }
}
