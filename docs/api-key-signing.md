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
import { LocalPrivateKeySigner } from '@fystack/sdk'
new FystackSDK({
  credentials: {
    apiKey: '...',
    signer: new LocalPrivateKeySigner('-----BEGIN PRIVATE KEY-----\n...')
  }
})

// Ed25519 scheme — key held in AWS KMS, never leaves KMS.
// `keyId` accepts a key ID, alias, or full ARN.
import { AwsKmsSigner } from '@fystack/sdk'

// Production, running on EC2/ECS/Lambda with an IAM role attached: omit
// `credentials` from clientConfig entirely and the underlying KMSClient
// picks up the injected role via its default credential provider chain.
new FystackSDK({
  credentials: {
    apiKey: '...',
    signer: new AwsKmsSigner({
      keyId: 'arn:aws:kms:ap-southeast-1:123456789012:key/1234abcd-...',
      clientConfig: { region: 'ap-southeast-1' }
    })
  }
})

// Local dev against LocalStack/minstack: point `endpoint` at the emulator
// and pass any placeholder static credentials it accepts.
new FystackSDK({
  credentials: {
    apiKey: '...',
    signer: new AwsKmsSigner({
      keyId: 'alias/signer',
      clientConfig: {
        region: 'ap-southeast-1',
        endpoint: 'http://localhost:4566',
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
      }
    })
  }
})

// Or bring your own pre-configured client (e.g. one built with
// `fromTemporaryCredentials`/`AssumeRoleCommand`, or shared/reused
// elsewhere in your app) via the `client` option instead of `clientConfig`:
import { KMSClient } from '@aws-sdk/client-kms'
new FystackSDK({
  credentials: {
    apiKey: '...',
    signer: new AwsKmsSigner({
      keyId: 'alias/signer',
      client: new KMSClient({ region: 'ap-southeast-1' })
    })
  }
})
```

`AwsKmsSignerOptions` (`src/requestSigner.ts`):

| Option         | Required | Notes                                                                                          |
| -------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `keyId`        | yes      | Key ID, alias (`alias/...`), or full ARN.                                                        |
| `client`       | no*      | A pre-configured `KMSClient`-like instance. Provide this **or** `clientConfig`, not both.         |
| `clientConfig` | no*      | Passed to `new KMSClient(...)`. Lazily requires `@aws-sdk/client-kms`. Omit `credentials` here to fall back to the default provider chain (IAM role injection); set `endpoint` + static `credentials` for LocalStack/minstack. |

\* If neither is given, `KMSClient` is constructed with `{}`, relying entirely on ambient AWS config/environment.

Implementation: `computeHMAC` / `signEd25519Request` in
`src/utils.ts` build and sign the canonical string; `LocalPrivateKeySigner`
and `AwsKmsSigner` in `src/requestSigner.ts` implement the `RequestSigner`
interface used for Ed25519 signing; `composeAPIHeaders` in `src/api.ts`
picks a scheme based on which credential field is set (`signer` → Ed25519,
`apiSecret` → HMAC) and attaches the `ACCESS-API-KEY` / `ACCESS-TIMESTAMP` /
`ACCESS-SIGN` headers. The rest of this document describes that wire
protocol in full, for non-SDK integrators and for reference.

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

In the SDK, wrap this private key (PEM PKCS8 format) in a `LocalPrivateKeySigner`
(or use `AwsKmsSigner` to keep the key in KMS) and pass it as `signer` on
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
  
