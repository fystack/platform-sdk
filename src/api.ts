import config from './config'
import fetch from 'cross-fetch'

interface APIResponse {
  // Define the structure of your API response
  // Adjust this based on your actual API response format
  data: any
  success: boolean
  message?: string
}

// Simplified GET request function
async function get(endpoint: string): Promise<APIResponse> {
  const response = await fetch(`${config.API.baseURL}/${endpoint}`)
  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch data')
  }

  return data
}

// Simplified POST request function
async function post(endpoint: string, body: any): Promise<APIResponse> {
  const response = await fetch(`${config.API.baseURL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to post data')
  }

  return data
}

export default {
  get,
  post
}
