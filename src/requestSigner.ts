import { signEd25519Request } from './utils'

/**
 * Signs the canonical request string for the Ed25519 API key scheme.
 *
 * Implementations decide where the key material lives — in process, in an HSM,
 * or behind a cloud KMS. The returned value is used verbatim as `ACCESS-SIGN`.
 */
export interface RequestSigner {
  /**
   * @param canonicalString - `method=...&path=...&timestamp=...&body=...`
   * @returns The base64-encoded raw Ed25519 signature.
   */
  sign(canonicalString: string): Promise<string>
}

/**
 * Signs with a PEM PKCS8 Ed25519 private key held in the current process.
 */
export class LocalPrivateKeySigner implements RequestSigner {
  constructor(private readonly privateKeyPem: string) {
    if (!privateKeyPem || privateKeyPem.trim() === '') {
      throw new Error('privateKeyPem is required')
    }
  }

  async sign(canonicalString: string): Promise<string> {
    return signEd25519Request(this.privateKeyPem, canonicalString)
  }
}

/**
 * Minimal structural type for the AWS KMS client, so this module does not
 * depend on `@aws-sdk/client-kms` at build time.
 */
export interface AwsKmsClientLike {
  send(command: any): Promise<{ Signature?: Uint8Array }>
}

export interface AwsKmsSignerOptions {
  /** KMS key id, ARN, or alias (e.g. `alias/signer`). */
  keyId: string
  /** Pre-configured KMS client. Provide this or `clientConfig`. */
  client?: AwsKmsClientLike
  /**
   * Config passed to `new KMSClient(...)` when `client` is omitted. Requires
   * `@aws-sdk/client-kms` to be installed; it is loaded lazily.
   */
  clientConfig?: Record<string, any>
}

/**
 * Signs through AWS KMS using an `ECC_NIST_EDWARDS25519` / `SIGN_VERIFY` key.
 * The private key never leaves KMS.
 */
export class AwsKmsSigner implements RequestSigner {
  private readonly keyId: string
  private readonly clientConfig?: Record<string, any>
  private client?: AwsKmsClientLike
  private signCommand?: new (input: Record<string, any>) => any

  constructor(options: AwsKmsSignerOptions) {
    if (!options.keyId || options.keyId.trim() === '') {
      throw new Error('keyId is required')
    }
    this.keyId = options.keyId
    this.client = options.client
    this.clientConfig = options.clientConfig
  }

  private async loadSdk(): Promise<void> {
    if (this.client && this.signCommand) return

    let kms: any
    try {
      kms = await import('@aws-sdk/client-kms')
    } catch (error) {
      throw new Error(
        'AwsKmsSigner requires the "@aws-sdk/client-kms" package. Install it, or pass a preconfigured client via the `client` option.'
      )
    }

    this.signCommand = kms.SignCommand
    this.client = this.client ?? new kms.KMSClient(this.clientConfig ?? {})
  }

  async sign(canonicalString: string): Promise<string> {
    await this.loadSdk()

    const command = new this.signCommand!({
      KeyId: this.keyId,
      Message: Buffer.from(canonicalString, 'utf8'),
      // ED25519_SHA_512 signs the message itself and requires RAW. The PH
      // variant would make KMS prehash on top of ours, changing the signature.
      MessageType: 'RAW',
      SigningAlgorithm: 'ED25519_SHA_512'
    })

    const response = await this.client!.send(command)
    if (!response.Signature) {
      throw new Error(`KMS returned no signature for key ${this.keyId}`)
    }

    return Buffer.from(response.Signature).toString('base64')
  }
}
