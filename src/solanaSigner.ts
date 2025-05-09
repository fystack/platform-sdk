import { APIService, WalletAddressType, WalletDetail } from './api'
import { APICredentials, TransactionStatusResponse, TxStatus, TransactionError } from './types'
import { Environment } from './config'
import { StatusPoller, StatusPollerOptions } from './utils/statusPoller'
import { Transaction, PublicKey, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { Buffer } from 'buffer'

export class SolanaSigner {
  private address!: string
  private APIService: APIService
  private APIKey: string
  private walletDetail: WalletDetail
  private pollerOptions?: StatusPollerOptions

  constructor(
    credentials: APICredentials,
    environment: Environment,
    pollerOptions?: StatusPollerOptions
  ) {
    this.APIKey = credentials.apiKey
    this.APIService = new APIService(credentials, environment)
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

    if (!this.APIKey && !this.walletDetail?.WalletID) {
      throw new Error('Wallet detail not found, use setWallet(walletId) to set wallet first!')
    }

    const detail: WalletDetail = await this.APIService.getWalletDetail(
      WalletAddressType.Sol,
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

  private async waitForTransactionStatus(transactionId: string): Promise<string> {
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
    console.log('result', result)

    if (!result.hash) {
      throw new TransactionError(
        'Transaction hash not found in successful response',
        'TRANSACTION_HASH_MISSING',
        result.transaction_id
      )
    }

    return result.hash
  }

  /**
   * Signs a Solana transaction
   * @param transaction Base64 encoded serialized transaction
   * @returns Signature as a base58 encoded string
   */
  async signTransaction(transaction: string): Promise<string> {
    if (!this.address) {
      await this.getAddress()
    }

    const data = {
      data: transaction,
      from: this.address
    }

    // Call the signRaw API similar to EtherSigner
    const response = await this.APIService.signTransaction(this.walletDetail.WalletID, {
      ...data,
      meta: {
        tx_method: 'solana_signTransaction'
      },
      chainId: '1399811149'
    })

    // Wait for the signature
    return this.waitForTransactionStatus(response.transaction_id)
  }

  /**
   * Signs a Solana message
   * @param message The message to sign (string or Uint8Array)
   * @returns Signature as a base58 encoded string
   */
  async signMessage(message: string | Uint8Array): Promise<string> {
    if (!this.address) {
      await this.getAddress()
    }

    const messageStr =
      typeof message === 'string' ? message : Buffer.from(message).toString('base64')

    const response = await this.APIService.requestSign(this.walletDetail.WalletID, {
      method: 'solana_signMessage',
      message: messageStr,
      chain_id: 0 // Not used for Solana but required by API
    })

    return this.waitForTransactionStatus(response.transaction_id)
  }

  /**
   * Signs and sends a Solana transaction
   * @param transaction Base64 encoded serialized transaction
   * @returns Transaction signature
   */
  async signAndSendTransaction(transaction: string): Promise<string> {
    if (!this.address) {
      await this.getAddress()
    }

    const data = {
      transaction,
      from: this.address,
      method: 'solana_signAndSendTransaction'
    }

    const response = await this.APIService.signTransaction(this.walletDetail.WalletID, data)
    const txHash = await this.waitForTransactionStatus(response.transaction_id)
    console.log('transaction succeed!')

    return txHash
  }

  /**
   * Signs multiple Solana transactions
   * @param transactions Array of base64 encoded serialized transactions
   * @returns Array of signatures as base58 encoded strings
   */
  async signAllTransactions(transactions: string[]): Promise<{ transactions: string[] }> {
    if (!this.address) {
      await this.getAddress()
    }

    // We need to get the signatures and then incorporate them into the transactions
    const signaturePromises = transactions.map(async (transaction) => {
      // Get the signature
      const signature = await this.signTransaction(transaction)

      // Here you would need to incorporate the signature into the transaction
      // This is a placeholder - you'll need to implement actual signature incorporation
      // based on your Solana transaction structure
      const signedTransaction = this.incorporateSignatureIntoTransaction(transaction, signature)
      return signedTransaction
    })

    // Wait for all transactions to be signed in parallel
    const signedTransactions = await Promise.all(signaturePromises)
    return { transactions: signedTransactions }
  }

  private incorporateSignatureIntoTransaction(transaction: string, signature: string): string {
    // Decode base64 transaction to buffer
    const transactionBuffer = Buffer.from(transaction, 'base64')

    try {
      // First try with legacy transaction format
      const tx = Transaction.from(transactionBuffer)

      // Decode the base58 signature
      const signatureBuffer = bs58.decode(signature)

      // Add the signature to the transaction
      tx.addSignature(new PublicKey(this.address), Buffer.from(signatureBuffer))

      // Serialize and encode back to base64
      return Buffer.from(tx.serialize()).toString('base64')
    } catch (error) {
      if (error.message.includes('Versioned messages')) {
        // Deserialize as a versioned transaction
        const versionedTx = VersionedTransaction.deserialize(transactionBuffer)

        // Add the signature (convert from base58)
        const signatureBuffer = bs58.decode(signature)
        versionedTx.signatures[0] = Buffer.from(signatureBuffer)

        // Serialize and encode back to base64
        return Buffer.from(versionedTx.serialize()).toString('base64')
      }
      // If it's another type of error, rethrow it
      throw error
    }
  }
}
