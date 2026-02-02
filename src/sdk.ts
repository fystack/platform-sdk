import { APIService } from './api'
import { Environment } from './config'
import { StatusPoller } from './utils/statusPoller'
import {
  CreateWalletResponse,
  WalletCreationStatusResponse,
  WalletAsset,
  DepositAddressResponse,
  APICredentials,
  CreateWalletOptions,
  RescanTransactionParams,
  WalletByWorkspaceResponse,
  RequestWithdrawalParams,
  RequestWithdrawalResponse,
  WebhookPublicKeyResponse
} from './types'
import { validateUUID } from './utils'
import { AddressType, WalletCreationStatus, WalletType } from './enum'

export interface SDKOptions {
  credentials: APICredentials
  workspaceId?: string
  environment?: Environment
  logger?: boolean
}

export class FystackSDK {
  private apiService: APIService
  private enableLogging: boolean
  private workspaceId?: string

  constructor(options: SDKOptions) {
    const {
      credentials,
      workspaceId,
      environment = Environment.Production,
      logger = false
    } = options
    this.apiService = new APIService(credentials, environment)
    this.enableLogging = logger
    this.workspaceId = workspaceId
  }

  private log(message: string): void {
    if (this.enableLogging) {
      console.log(`[FystackSDK] ${message}`)
    }
  }

  /**
   * Creates a new wallet
   * @param options Wallet creation options
   * @param waitForCompletion Whether to wait for the wallet creation to complete
   * @returns Promise with wallet ID and status
   */
  async createWallet(
    options: CreateWalletOptions,
    waitForCompletion: boolean = true
  ): Promise<CreateWalletResponse> {
    const {
      name,
      walletType = WalletType.Hyper,
      sweepTaskParams,
      walletPurpose,
      sweepTaskId
    } = options

    const response = await this.apiService.createWallet({
      name,
      walletType,
      walletPurpose,
      sweepTaskParams,
      sweepTaskId
    })

    if (waitForCompletion && response.status === WalletCreationStatus.Pending) {
      return this.waitForWalletCreation(response.wallet_id)
    }

    return response
  }

  /**
   * Gets all wallets for the workspace
   * @returns Promise with list of wallets
   */
  async getWallets(): Promise<WalletByWorkspaceResponse[]> {
    if (!this.workspaceId) {
      throw new Error('Workspace ID is required. Please set workspaceId in the constructor.')
    }

    const wallets = await this.apiService.getWallets(this.workspaceId)
    return wallets
  }

  /**
   * Gets the current status of a wallet creation process
   * @param walletId The ID of the wallet being created
   * @returns Promise with wallet creation status details
   */
  async getWalletCreationStatus(walletId: string): Promise<WalletCreationStatusResponse> {
    const response = await this.apiService.getWalletCreationStatus(walletId)
    return response
  }

  /**
   * Waits for a wallet to be created and returns the final status
   * @param walletId The ID of the wallet being created
   * @returns Promise with wallet ID and final status
   */
  private async waitForWalletCreation(walletId: string): Promise<CreateWalletResponse> {
    const poller = new StatusPoller()

    // Poll for wallet creation status
    const result = await poller.poll<WalletCreationStatusResponse>(
      // Polling function
      async () => {
        this.log('Polling wallet creation status...')
        const response = await this.apiService.getWalletCreationStatus(walletId)
        return response
      },
      // Success condition - when status is either success or error
      (result) =>
        [WalletCreationStatus.Success, WalletCreationStatus.Error].includes(result.status),
      // Error condition - no specific error condition needed, as we're polling until final state
      undefined
    )

    this.log(`Wallet creation completed with status: ${result.status}`)

    return {
      wallet_id: result.wallet_id,
      status: result.status
    }
  }

  /**
   * Gets assets associated with a wallet
   * @param walletId The ID of the wallet
   * @returns Promise with wallet assets
   */
  async getWalletAssets(walletId: string): Promise<WalletAsset[]> {
    if (!walletId || walletId.trim() === '') {
      throw new Error('Invalid wallet ID provided')
    }

    const data = await this.apiService.getWalletAssets(walletId)
    return data
  }

  /**
   * Gets deposit address for a wallet by address type
   * @param walletId The wallet ID
   * @param addressType The type of address (evm, sol)
   * @returns Promise with deposit address information
   */
  async getDepositAddress(
    walletId: string,
    addressType: AddressType
  ): Promise<DepositAddressResponse> {
    validateUUID(walletId, 'walletId')

    if (!Object.values(AddressType).includes(addressType)) {
      throw new Error(
        `Invalid address type: ${addressType}. Must be one of: ${Object.values(AddressType).join(
          ', '
        )}`
      )
    }

    const depositAddressInfo = await this.apiService.getDepositAddress(walletId, addressType)
    return depositAddressInfo
  }

  /**
   * Rescans a transaction on a specific network
   * @param params Transaction hash and network ID
   * @returns Promise that resolves when the rescan is initiated
   */
  async rescanTransaction(params: RescanTransactionParams): Promise<void> {
    validateUUID(params.networkId, 'networkId')

    if (!params.txHash || params.txHash.trim() === '') {
      throw new Error('Invalid transaction hash provided')
    }

    await this.apiService.rescanTransaction(params)
  }

  /**
   * Requests a withdrawal from a wallet
   * @param walletId The ID of the wallet to withdraw from
   * @param params Withdrawal parameters including asset, amount, and recipient
   * @returns Promise with withdrawal response including auto_approved status and withdrawal details
   */
  async requestWithdrawal(
    walletId: string,
    params: RequestWithdrawalParams
  ): Promise<RequestWithdrawalResponse> {
    validateUUID(walletId, 'walletId')
    validateUUID(params.assetId, 'assetId')

    if (!params.amount || params.amount.trim() === '') {
      throw new Error('Invalid amount provided')
    }

    if (!params.recipientAddress || params.recipientAddress.trim() === '') {
      throw new Error('Invalid recipient address provided')
    }

    if (params.recipientAddress.length > 256) {
      throw new Error('Recipient address exceeds maximum length of 256 characters')
    }

    if (params.notes && params.notes.length > 500) {
      throw new Error('Notes exceed maximum length of 500 characters')
    }

    this.log(`Requesting withdrawal from wallet ${walletId}`)
    const response = await this.apiService.requestWithdrawal(walletId, params)
    this.log(`Withdrawal request completed, auto_approved: ${response.auto_approved}`)

    return response
  }

  /**
   * Gets the webhook public key for a workspace
   * @param workspaceId The workspace ID
   * @returns Promise with webhook public key (base64 encoded ed25519 public key)
   */
  async getWebhookPublicKey(workspaceId: string): Promise<WebhookPublicKeyResponse> {
    validateUUID(workspaceId, 'workspaceId')

    this.log(`Getting webhook public key for workspace ${workspaceId}`)
    const response = await this.apiService.getWebhookPublicKey(workspaceId)
    return response
  }
}
