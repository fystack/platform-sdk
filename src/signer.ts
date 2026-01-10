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
import { APICredentials, TransactionStatusResponse, TransactionError } from './types'
import { Environment } from './config'
import { StatusPoller, StatusPollerOptions } from './utils/statusPoller'
import { AddressType, TxStatus } from './enum'

export class EtherSigner extends AbstractSigner {
  private address!: string
  private APICredentials!: APICredentials
  private APIService: APIService
  private walletDetail: WalletDetail
  private environment: Environment
  private pollerOptions?: StatusPollerOptions

  constructor(
    credentials: APICredentials,
    environment: Environment,
    provider?: null | Provider,
    pollerOptions?: StatusPollerOptions
  ) {
    super(provider)

    this.APICredentials = credentials
    this.APIService = new APIService(credentials, environment)
    this.environment = environment
    this.pollerOptions = pollerOptions
  }

  setWallet(walletId: string): void {
    if (!walletId || walletId.trim() === '') {
      throw new Error('Invalid wallet ID provided')
    }
    // Set walletId in walletDetail with default values for required properties
    this.walletDetail = {
      WalletID: walletId,
      APIKey: '',
      Name: '',
      AddressType: '',
      Address: ''
      // Other fields will be populated when getAddress is called
    }
    // Reset address cache since we're changing wallets
    this.address = ''
  }

  async getAddress(): Promise<string> {
    if (this.address) {
      return this.address
    }

    if (
      !this.APICredentials.apiKey &&
      !this.APICredentials.authToken &&
      !this.walletDetail.WalletID
    ) {
      throw new Error('Wallet detail not found, use setWallet(walletId) to set wallet first!')
    }

    const detail: WalletDetail = await this.APIService.getWalletDetail(
      AddressType.Evm,
      this.walletDetail?.WalletID
    )

    this.walletDetail = detail
    if (detail?.Address) {
      // cache the address
      this.address = detail.Address
    }

    if (!this.address) {
      throw new Error('Address not found')
    }

    return this.address
  }

  private async getChainId(): Promise<number> {
    if (!this.provider) {
      throw new Error('Provider is required for signing operations')
    }

    try {
      const network = await this.provider.getNetwork()
      return Number(network.chainId)
    } catch (error) {
      throw new Error('Failed to get chainId from provider: ' + error)
    }
  }

  connect(provider: null | Provider): EtherSigner {
    return new EtherSigner(this.APICredentials, this.environment, provider)
  }

  private async waitForSignature(walletId: string, transactionId: string): Promise<string> {
    const poller = new StatusPoller(this.pollerOptions)
    const status = await poller.poll(
      // Polling function
      () => this.APIService.getSignStatus(walletId, transactionId),
      // Success condition
      (result) => result.status === TxStatus.Confirmed && result.signature != null,
      // Error condition
      (result) => [TxStatus.Failed, TxStatus.Rejected].includes(result.status)
    )

    if (!status.signature) {
      throw new Error('Signature not found in successful response')
    }

    return status.signature
  }

  private async waitForTransactonStatus(transactionId: string): Promise<string> {
    const poller = new StatusPoller(this.pollerOptions)
    // Poll for transaction status using signaturePoller
    const result = await poller.poll<TransactionStatusResponse>(
      // Polling function
      () => {
        console.log('Polling status')
        return this.APIService.getTransactionStatus(this.walletDetail.WalletID, transactionId)
      },
      // Success condition
      (result) =>
        (result.status === TxStatus.Confirmed || result.status === TxStatus.Completed) &&
        !!result.hash,
      // Error condition
      (result) => {
        if (result.status === TxStatus.Failed) {
          throw new TransactionError(
            result.failed_reason || 'Transaction failed',
            'TRANSACTION_FAILED',
            result.transaction_id
          )
        }
        return result.status === TxStatus.Rejected
      }
    )
    console.log('reulst', result)

    if (!result.hash) {
      throw new TransactionError(
        'Transaction hash not found in successful response',
        'TRANSACTION_HASH_MISSING',
        result.transaction_id
      )
    }

    return result.hash
  }

  // Copied and editted from ethers.js -> Wallet -> BaseWallet
  async signTransaction(
    tx: TransactionRequest,
    options?: { idempotencyKey?: string }
  ): Promise<string> {
    const startTime = new Date()
    console.log(`[WalletSDK] Transaction started at: ${startTime.toLocaleString()}`)

    if (!this.address) {
      await this.getAddress()
    }

    if (!this.walletDetail) {
      this.walletDetail = await this.APIService.getWalletDetail()
    }

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
    const response = await this.APIService.signTransaction(
      this.walletDetail.WalletID,
      data,
      options
    )
    const txHash = await this.waitForTransactonStatus(response.transaction_id)

    const endTime = new Date()
    const elapsedTimeMs = endTime.getTime() - startTime.getTime()
    console.log(`[WalletSDK] Transaction completed at: ${endTime.toLocaleString()}`)
    console.log(
      `[WalletSDK] Transaction took ${elapsedTimeMs}ms (${(elapsedTimeMs / 1000).toFixed(2)}s)`
    )
    console.log('[WalletSDK] Transaction succeed!')

    return txHash
  }

  async sendTransaction(
    tx: TransactionRequest,
    options?: { idempotencyKey?: string }
  ): Promise<TransactionResponse> {
    const startTime = new Date()
    console.log(`[WalletSDK] sendTransaction started at: ${startTime.toLocaleString()}`)

    if (!this.address) {
      await this.getAddress()
    }

    if (!this.walletDetail) {
      this.walletDetail = await this.APIService.getWalletDetail()
    }

    checkProvider(this, 'sendTransaction')

    // Only populate if gas fees are not set
    const hasGasFees =
      tx.gasPrice != null || (tx.maxFeePerGas != null && tx.maxPriorityFeePerGas != null)

    let populatedTx = tx
    if (!hasGasFees) {
      const populateStartTime = new Date()
      console.log(
        `[WalletSDK] populateTransaction started at: ${populateStartTime.toLocaleString()}`
      )
      populatedTx = await this.populateTransaction(tx)
      const populateEndTime = new Date()
      const populateElapsedMs = populateEndTime.getTime() - populateStartTime.getTime()
      console.log(
        `[WalletSDK] populateTransaction completed in ${(populateElapsedMs / 1000).toFixed(2)}s`
      )
    } else {
      console.log(`[WalletSDK] Skipping transaction population as gas fees are already set`)
    }

    delete populatedTx.from

    // Ensure all properties are properly resolved to their string representations
    const resolvedTx = (await resolveProperties(populatedTx)) as TransactionLike<string>
    const txObj = Transaction.from(resolvedTx)

    console.log('[WalletSDK] Tx Data', txObj)

    const txHash = await this.signTransaction(txObj, options)

    // Instead of creating a mock response, get the actual transaction from the provider
    const endTime = new Date()
    const totalElapsedMs = endTime.getTime() - startTime.getTime()
    console.log(`[WalletSDK] sendTransaction completed at: ${endTime.toLocaleString()}`)
    console.log(`[WalletSDK] sendTransaction took ${(totalElapsedMs / 1000).toFixed(2)}s`)
    console.log('[WalletSDK] Transaction sent successfully!')

    const txResponse: TransactionResponseParams = {
      blockNumber: 0, // Default to 0 as this is an async transaction
      blockHash: '0x0000000000000000000000000000000000000000000000000000000000000000', // not available yet
      hash: txHash, // not available yet
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

    // Let the provider create the TransactionResponse using the txHash
    return new TransactionResponse(txResponse, this.provider as Provider)
  }

  async signMessage(
    message: string | Uint8Array,
    options?: { idempotencyKey?: string }
  ): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider is required for signing operations')
    }

    if (!this.address) {
      await this.getAddress()
    }

    if (!this.walletDetail) {
      this.walletDetail = await this.APIService.getWalletDetail()
    }

    const chainId = await this.getChainId()
    const messageStr = typeof message === 'string' ? message : Buffer.from(message).toString('hex')

    const response = await this.APIService.requestSign(
      this.walletDetail.WalletID,
      {
        method: 'eth_sign',
        message: messageStr,
        chain_id: chainId
      },
      options
    )

    return this.waitForSignature(this.walletDetail.WalletID, response.transaction_id)
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>,
    options?: { idempotencyKey?: string }
  ): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider is required for signing operations')
    }

    if (!this.address) {
      await this.getAddress()
    }

    if (!this.walletDetail) {
      this.walletDetail = await this.APIService.getWalletDetail()
    }

    const chainId = await this.getChainId()
    const typedData = JSON.stringify({
      domain,
      types,
      message: value
    })

    const response = await this.APIService.requestSign(
      this.walletDetail.WalletID,
      {
        method: 'eth_signTypedData_v4',
        message: '',
        chain_id: chainId,
        typed_data: typedData
      },
      options
    )

    return this.waitForSignature(this.walletDetail.WalletID, response.transaction_id)
  }
}

function checkProvider(signer: AbstractSigner, operation: string): Provider {
  if (signer.provider) {
    return signer.provider
  }
  assert(false, 'missing provider', 'UNSUPPORTED_OPERATION', { operation })
}
