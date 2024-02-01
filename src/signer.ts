import {
  AbstractSigner,
  TypedDataDomain,
  TypedDataField,
  resolveProperties,
  resolveAddress,
  assertArgument,
  getAddress,
  Transaction,
  TransactionLike,
  assert,
  Provider,
  TransactionResponse,
  TransactionResponseParams,
  Signature
} from 'ethers'
import { TransactionRequest } from 'ethers/src.ts/providers'
import { APIService, WalletDetail } from './api'
import { APICredentials } from './types'

export class ApexSigner extends AbstractSigner {
  private address!: string
  private APICredentials!: APICredentials
  private APIService: APIService
  private walletDetail: WalletDetail

  constructor(credentials: APICredentials, provider?: null | Provider) {
    super(provider)

    this.APICredentials = credentials
    this.APIService = new APIService(credentials)
  }

  async getAddress(): Promise<string> {
    if (this.address) {
      return this.address
    }

    const detail: WalletDetail = await this.APIService.getWalletDetail()
    this.walletDetail = detail
    if (detail?.Address) {
      // cache the address
      this.address = detail.Address
    }

    return this.address
  }

  connect(provider: null | Provider): ApexSigner {
    return new ApexSigner(this.APICredentials, provider)
  }

  // Copied and editted from ethers.js -> Wallet -> BaseWallet
  async signTransaction(tx: TransactionRequest): Promise<string> {
    // Replace any Addressable or ENS name with an address
    const { to, from } = await resolveProperties({
      to: tx.to ? resolveAddress(tx.to, this.provider) : undefined,
      from: tx.from ? resolveAddress(tx.from, this.provider) : undefined
    })

    if (to != null) {
      tx.to = to
    }
    if (from != null) {
      tx.from = from
    }

    if (tx.from != null) {
      assertArgument(
        getAddress(<string>tx.from) === this.address,
        'transaction from address mismatch',
        'tx.from',
        tx.from
      )
      delete tx.from
    }

    const fromAddress = this.address
    // Build the transaction
    const btx = Transaction.from(<TransactionLike<string>>tx)
    const data = {
      maxFeePerGas: btx.maxFeePerGas,
      maxPriorityFeePerGas: btx.maxPriorityFeePerGas,
      to: btx.to,
      from: fromAddress,
      nonce: btx.nonce,
      gasLimit: btx.gasLimit,
      data: btx.data,
      value: btx.value,
      chainId: btx.chainId,
      accessList: btx.accessList
    }
    // return unseralized as API signTransaction is an asynchoronous action
    await this.APIService.signTransaction(this.walletDetail.WalletID, data)
    return btx.unsignedSerialized
  }

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    if (!this.address) {
      await this.getAddress()
    }

    const provider = checkProvider(this, 'sendTransaction')
    const pop = await this.populateTransaction(tx)
    delete pop.from

    const txObj = Transaction.from(pop)
    await this.signTransaction(txObj)

    const txResponse: TransactionResponseParams = {
      blockNumber: 0, // Default to 0 as this is an async transaction
      blockHash: '0x0000000000000000000000000000000000000000000000000000000000000000', // not available yet
      hash: '0x0000000000000000000000000000000000000000000000000000000000000000', // not available yet
      index: 0,
      type: 0,
      to: tx.to as any,
      from: this.address,
      /**
       *
       */
      nonce: txObj.nonce, // The nonce of the transaction, used for replay protection.
      /**
       *  The maximum amount of gas this transaction is authorized to consume.
       */
      gasLimit: txObj.gasLimit,

      /**
       *  For legacy transactions, this is the gas price per gas to pay.
       */
      gasPrice: txObj.gasPrice ? txObj.gasPrice : BigInt(0),

      /**
       *  For [[link-eip-1559]] transactions, this is the maximum priority
       *  fee to allow a producer to claim.
       */
      maxPriorityFeePerGas: txObj.maxPriorityFeePerGas,

      /**
       *  For [[link-eip-1559]] transactions, this is the maximum fee that
       *  will be paid.
       */
      maxFeePerGas: txObj.maxFeePerGas,

      /**
       *  The transaction data.
       */
      data: txObj.data,

      /**
       *  The transaction value (in wei).
       */
      value: txObj.value,

      /**
       *  The chain ID this transaction is valid on.
       */
      chainId: txObj.chainId,

      signature: Signature.from('0x' + '0'.repeat(130)), // length of signature is 65 bytes - 130 hex chars
      /**
       *  The transaction access list.
       */
      accessList: txObj.accessList
    }
    return new TransactionResponse(txResponse, this.provider as Provider)
  }

  signMessage(message: string | Uint8Array): Promise<string> {
    throw new Error('signMessage will be supported asap!')
  }

  signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string> {
    throw new Error('sign typed data will be supported asap!')
  }
}

function checkProvider(signer: AbstractSigner, operation: string): Provider {
  if (signer.provider) {
    return signer.provider
  }
  assert(false, 'missing provider', 'UNSUPPORTED_OPERATION', { operation })
}
