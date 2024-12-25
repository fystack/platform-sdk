export interface APICredentials {
  APIKey: string
  APISecret: string
}

export interface WebhookEvent {
  webhook_id: string // Equivalent to "webhook_id" in Go struct
  resource_id: string // Equivalent to "resource_id" in Go struct
  url: string // URL where the webhook was triggered
  payload: any // Binary or string representation of the payload
  event: string // Name of the event
}
