# API Key Request Signing

Integration guide for client applications and SDKs authenticating to Apex
with a workspace or platform API key (as opposed to a user session/bearer
token). Covers both supported signing schemes: **HMAC-SHA256** (secret-based)
and **Ed25519** (public-key based).

## Using this from the SDK

If you're using `@fystack/sdk`, you don't need to implement anything below —
the SDK builds the canonical string, timestamps the request, and signs it for
you. Just pass the right credential shape:

```typescript
// HMAC-SHA256 scheme
new FystackSDK({ credentials: { apiKey: '...', apiSecret: '...' } })

// Ed25519 scheme — PEM PKCS8 private key, matches the public_key registered on the API key
new FystackSDK({ credentials: { apiKey: '...', privateKey: '-----BEGIN PRIVATE KEY-----\n...' } })
```

Implementation: `computeHMAC` / `signEd25519Request` in
`src/utils.ts` build and sign the canonical string; `composeAPIHeaders` in
`src/api.ts` picks a scheme based on which credential field is set
(`privateKey` → Ed25519, `apiSecret` → HMAC) and attaches the
`ACCESS-API-KEY` / `ACCESS-TIMESTAMP` / `ACCESS-SIGN` headers. The rest of
this document describes that wire protocol in full, for non-SDK integrators
and for reference.

## Headers

Every signed request must carry these three headers:

| Header            | Type                | Notes                                                     |
| ------------------ | ------------------- | ----------------------------------------------------------|
| `ACCESS-API-KEY`   | string (uuid4)       | The API key ID (`api_key` field returned at creation).    |
| `ACCESS-TIMESTAMP` | string (unsigned int) | Unix timestamp in **seconds** at signing time.            |
| `ACCESS-SIGN`      | string (base64)      | The signature — encoding differs by scheme, see below.    |

`ACCESS-TIMESTAMP` must be within **5 minutes** of server time (past or
future) or the request is rejected with `Invalid access timestamp`. Sign and
send the request promptly — don't precompute far ahead of time.

## Canonical string to sign

Both schemes sign the same message, built from the request:

```
method=<HTTP_METHOD>&path=<HTTP_PATH>&timestamp=<ACCESS-TIMESTAMP>&body=<RAW_BODY>
```

- `HTTP_METHOD` — uppercase, e.g. `GET`, `POST`, `PATCH`, `DELETE`.
- `HTTP_PATH` — the request path **including the `/api/v1` prefix**, no
  query string, exactly as sent (e.g. `/api/v1/workspaces/{workspaceId}/invite`).
- `timestamp` — the same integer value sent in `ACCESS-TIMESTAMP`.
- `body` — the **exact raw request body bytes** as a string. For a `GET`
  request (or any request with no body), use an empty string. Do not
  re-serialize/reformat JSON before signing — sign the exact bytes you will
  transmit, since the server signs against the exact bytes it receives.

Example, for `POST /api/v1/workspaces/abc-123/invite` at `timestamp=1735689600`
with body `{"email":"a@b.com"}`:

```
method=POST&path=/api/v1/workspaces/abc-123/invite&timestamp=1735689600&body={"email":"a@b.com"}
```

## Scheme 1: HMAC-SHA256 (secret key)

Used when the API key was created without a `public_key` (the default). The
plaintext secret is only ever shown once, in the creation response
(`api_secret`), as a **hex-encoded string** — store it as-is.

**Signing steps:**

1. Build the canonical string (above).
2. Compute `HMAC-SHA256(key = api_secret_string_bytes, message = canonical_string_bytes)`.
   The key is the literal hex-string characters from `api_secret` (UTF-8
   bytes), **not** the hex-decoded raw bytes.
3. Hex-encode the resulting digest (lowercase hex string).
4. Base64-encode that hex string. This is the `ACCESS-SIGN` header value.

```
ACCESS-SIGN = base64( hex( HMAC_SHA256(key=api_secret, msg=canonical_string) ) )
```

Pseudocode:

```js
const digest = hmacSha256(apiSecret, canonicalString);       // raw bytes
const hexDigest = toHex(digest);                             // lowercase hex string
const accessSign = base64Encode(utf8Bytes(hexDigest));       // ACCESS-SIGN header
```

## Scheme 2: Ed25519 (public key)

Used when the API key was created with a `public_key` (PEM, PKIX,
`-----BEGIN PUBLIC KEY-----`). The corresponding private key never leaves
the client — only the public key is registered with Apex.

In the SDK, pass this private key (PEM PKCS8 format) as `privateKey` on
`APICredentials` — see [Using this from the SDK](#using-this-from-the-sdk).

**Signing steps:**

1. Build the canonical string (above).
2. Sign the canonical string bytes directly with the Ed25519 private key
   (64-byte signature, no hashing/pre-digest — Ed25519 does this internally).
3. Base64-encode the raw signature bytes. This is the `ACCESS-SIGN` header
   value (no hex step, unlike HMAC).

```
ACCESS-SIGN = base64( Ed25519_Sign(privateKey, canonical_string) )
```

### Key rotation (Ed25519 only)

To rotate an Ed25519 key without downtime:

1. Generate a new keypair.
2. `PATCH` the API key with `new_public_key` set to the new PEM public key
   (`internal/api/workspace/service.go: UpdateAPIKey`). The key now accepts
   signatures from **either** the old or new key.
3. Switch the client to sign with the new private key.
4. On the first request successfully verified with the new key, the server
   auto-promotes it: `public_key` becomes the new key and `new_public_key`
   is cleared. The old key stops working after that point.

HMAC keys cannot be rotated this way — `new_public_key` is rejected with
`new_public_key requires an Ed25519 key; this key uses HMAC` if the API key
uses a secret.

## Additional checks enforced server-side

- **IP allowlist**: if the API key has `allowed_ips` configured, the request
  is rejected with `IP address not whitelisted` unless the caller's IP
  matches an entry (single IP or CIDR).
- **Expiration**: keys default to a 90-day TTL if `expires_at` isn't set at
  creation, capped at 365 days. An expired, disabled, or revoked key is
  rejected.
- **Scope**: workspace-scoped keys (`scope_type: workspace`) can call any
  in-scope route for the workspace; wallet-scoped keys
  (`scope_type: wallet`, `scope_ids`) are restricted to specific wallets.

## API endpoints

All management endpoints require a **user session** (`Authorization: Bearer`
or `access_token` cookie) — an API key cannot create, list, update, or
delete other API keys. `workspaceId` and `apiKeyId` are path UUIDs.

| Method | Path                                              | Handler        | Required permission | Notes |
| ------ | -------------------------------------------------- | -------------- | -------------------- | ----- |
| POST   | `/api/v1/workspaces/{workspaceId}/api-key`         | `CreateAPIKey` | `create_api_key`     | Also requires `X-MFA-Token` header if the caller has MFA enabled (see below). |
| GET    | `/api/v1/workspaces/{workspaceId}/api-keys`        | `GetAllAPIKeys`| `view_api_key`       | Lists keys for the workspace. |
| PATCH  | `/api/v1/workspaces/{workspaceId}/api-key/{apiKeyId}` | `UpdateAPIKey` | `update_api_key`  | Partial update; see fields below. |
| DELETE | `/api/v1/workspaces/{workspaceId}/api-key/{apiKeyId}` | `DeleteAPIKey` | `delete_api_key`  | Immediate, irreversible revocation. |

(Source: `internal/api/workspace/controller.go`, routes registered at
`RegisterRoutes`.)

### MFA on create

`POST .../api-key` is wrapped in `api.RequireMFAToken(...,
enum.MFAOperationCreateAPIKey)`. If the calling user has MFA enabled, the
request must carry a fresh `X-MFA-Token` header (obtained from the
account's MFA challenge flow) or it's rejected with `MFA token required` /
`Invalid or expired MFA token`. Users without MFA enabled skip this check.

### Create — request body

`POST /api/v1/workspaces/{workspaceId}/api-key`

```json
{
  "name": "my-integration",
  "role_id": "b1f0...",
  "scope_type": "workspace",
  "scope_ids": [],
  "wallet_id": null,
  "allowed_ips": ["203.0.113.10", "198.51.100.0/24"],
  "expires_at": "2027-01-01T00:00:00Z",
  "public_key": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
}
```

| Field         | Type              | Notes                                                              |
| ------------- | ----------------- | --------------------------------------------------------------------|
| `name`        | string, required  | 3–100 chars, alphanumeric + spaces.                                 |
| `role_id`     | uuid, optional     | Grants the key this role; omit to use the default (workspace admin). |
| `scope_type`  | `workspace`\|`wallet`, optional | Defaults to `workspace`.                              |
| `scope_ids`   | uuid[], optional   | Wallet IDs; required (non-empty) when `scope_type` is `wallet`.     |
| `wallet_id`   | uuid, optional     | Convenience alias — setting it implies `scope_type: wallet`.        |
| `allowed_ips` | string[], optional | Up to 50 IPs/CIDRs. Empty/omitted = no IP restriction.              |
| `expires_at`  | RFC3339, optional  | Future date, max 365 days out. Omit for the 90-day default.         |
| `public_key`  | string, optional   | PEM Ed25519 public key. Omit to get an HMAC secret instead.         |

Response (HMAC case):

```json
{
  "success": true,
  "data": {
    "name": "my-integration",
    "api_key": "b8e2...-uuid",
    "api_secret": "9f3a1c...hex-secret-shown-once"
  }
}
```

Response (Ed25519 case): `api_secret` is omitted, `public_key` is echoed
back instead. **`api_secret` is never retrievable again after creation** —
if it's lost, delete the key and create a new one.

### List

`GET /api/v1/workspaces/{workspaceId}/api-keys` — no body/query params.
Returns an array of key metadata (never the secret):

```json
{
  "success": true,
  "data": [
    {
      "id": "b8e2...-uuid",
      "name": "my-integration",
      "created_at": "2026-01-01T00:00:00Z",
      "wallet": null,
      "allowed_ips": ["203.0.113.10"],
      "role": { "id": "b1f0...", "name": "admin" },
      "scope_type": "workspace",
      "scope_ids": [],
      "expires_at": "2027-01-01T00:00:00Z",
      "last_used_at": "2026-07-10T08:00:00Z"
    }
  ]
}
```

### Update

`PATCH /api/v1/workspaces/{workspaceId}/api-key/{apiKeyId}`

```json
{
  "allowed_ips": ["203.0.113.10"],
  "role_id": "b1f0...",
  "scope_type": "wallet",
  "scope_ids": ["c3d4...-uuid"],
  "expires_at": "2027-06-01T00:00:00Z",
  "new_public_key": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
}
```

All fields are optional and independent — send only what changes. See
[Key rotation (Ed25519 only)](#key-rotation-ed25519-only) for
`new_public_key` semantics. Response is `{ "success": true, "data": null }`
on success.

### Delete

`DELETE /api/v1/workspaces/{workspaceId}/api-key/{apiKeyId}` — no body.
Revokes the key immediately; any in-flight signed request using it will
subsequently fail with `API key not found`. Response is
`{ "success": true, "data": null }`.

## Key files (backend internals)

| Layer                | File                                                                 |
| --------------------- | --------------------------------------------------------------------|
| Routes + handlers      | `internal/api/workspace/controller.go` (`CreateAPIKey`, `GetAllAPIKeys`, `UpdateAPIKey`, `DeleteAPIKey`) |
| Request params         | `internal/api/workspace/params.go` (`APIKeyParams`, `UpdateAPIKeyParams`) |
| Header binding         | `internal/api/middleware.go` (`APIKeyHeaders`, `VerifyAPIKeyAccess`, `RequireMFAToken`) |
| Signature verification | `pkg/services/apikey/validator.go` (`ValidateRequest`, `constructSignString`, `ValidateAccessSign`) |
| Ed25519 primitives     | `pkg/encryption/ed25519.go`                                          |
| Secret encrypt/decrypt | `pkg/encryption/api_key.go`                                          |
| Key creation/rotation  | `internal/api/workspace/service.go` (`CreateAPIKey`, `UpdateAPIKey`) |
