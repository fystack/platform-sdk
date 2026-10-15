import { APIService } from './api'
import { Environment } from './config'
import { StatusPoller, StatusPollerOptions } from './utils/statusPoller'
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
  Withdrawal,
  WebhookPublicKeyResponse,
  CreateSweepTaskParams,
  SweepTaskResponse,
  RequestOptions
} from './types'
import { characterLength, validateUUID } from './utils'
import { AddressType, FeePriority, WalletCreationStatus, WalletPurpose, WalletType } from './enum'

// Wallet purposes Apex accepts when creating a wallet
const CREATABLE_WALLET_PURPOSES: string[] = [
  WalletPurpose.General,
  WalletPurpose.User,
  WalletPurpose.Gastank,
  WalletPurpose.Payment,
  WalletPurpose.OneTimeUse
]

export interface SDKOptions {
  credentials: APICredentials
  workspaceId?: string
  environment?: Environment
  domain?: string
  /** Enable debug logging. Defaults to false */
  debug?: boolean
  /** Polling limits used while waiting for wallet creation */
  pollerOptions?: StatusPollerOptions
}

export class FystackSDK {
  private apiService: APIService
  private debugEnabled: boolean
  private workspaceId?: string
  private pollerOptions?: StatusPollerOptions

  public automation: AutomationNamespace

  constructor(options: SDKOptions) {
    const {
      credentials,
      workspaceId,
      environment = Environment.Production,
      domain,
      debug = false,
      pollerOptions
    } = options
    this.apiService = new APIService(credentials, environment, domain)
    this.debugEnabled = debug
    this.workspaceId = workspaceId
    this.pollerOptions = pollerOptions
    this.automation = new AutomationNamespace(this)
  }

  private log(message: string): void {
    if (this.debugEnabled) {
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
      sweepTaskId,
      networkIds,
      gasSponsorshipEnabled,
      approvalGroupId
    } = options

    if (!name || name.trim() === '' || characterLength(name) > 100) {
      throw new Error('Wallet name is required and must not exceed 100 characters')
    }
    if (walletType !== WalletType.Hyper && walletType !== WalletType.MPC) {
      throw new Error(`Invalid wallet type: ${walletType}. Must be standard or mpc`)
    }
    if (walletPurpose !== undefined && !CREATABLE_WALLET_PURPOSES.includes(walletPurpose)) {
      throw new Error(
        `Invalid wallet purpose: ${walletPurpose}. Must be one of: ${CREATABLE_WALLET_PURPOSES.join(', ')}`
      )
    }
    for (const networkId of networkIds ?? []) {
      validateUUID(networkId, 'networkIds')
    }
    if (sweepTaskId !== undefined) {
      validateUUID(sweepTaskId, 'sweepTaskId')
    }
    if (approvalGroupId !== undefined) {
      validateUUID(approvalGroupId, 'approvalGroupId')
    }

    const response = await this.apiService.createWallet({
      name,
      walletType,
      walletPurpose,
      sweepTaskParams,
      sweepTaskId,
      networkIds,
      gasSponsorshipEnabled,
      approvalGroupId
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
    const poller = new StatusPoller(this.pollerOptions)

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
   * @param addressType The type of address (evm, btc, sol, tron)
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
   * Gets the network-specific deposit address for an asset. For Bitcoin, Apex
   * uses the asset network to select mainnet or testnet Bech32 encoding.
   * @param walletId The wallet ID
   * @param assetId The asset ID
   * @returns Promise with deposit address information
   */
  async getDepositAddressByAssetId(
    walletId: string,
    assetId: string
  ): Promise<DepositAddressResponse> {
    validateUUID(walletId, 'walletId')
    validateUUID(assetId, 'assetId')

    return this.apiService.getDepositAddressByAssetId(walletId, assetId)
  }

  /**
   * Rescans a transaction on a specific network. Apex accepts this only with a
   * system administrator access token (credentials.authToken), not an API key.
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
   * @param options Request options such as an idempotency key (UUID)
   * @returns Promise with withdrawal response including auto_approved status and withdrawal details
   */
  async requestWithdrawal(
    walletId: string,
    params: RequestWithdrawalParams,
    options?: RequestOptions
  ): Promise<RequestWithdrawalResponse> {
    validateUUID(walletId, 'walletId')
    if (params.assetId) {
      validateUUID(params.assetId, 'assetId')
    } else if (!params.asset || !params.network) {
      throw new Error('Either assetId or both asset and network must be provided')
    }

    if (!params.amount || params.amount.trim() === '') {
      throw new Error('Invalid amount provided')
    }

    if (!params.recipientAddress || params.recipientAddress.trim() === '') {
      throw new Error('Invalid recipient address provided')
    }

    if (characterLength(params.recipientAddress) > 256) {
      throw new Error('Recipient address exceeds maximum length of 256 characters')
    }

    if (params.notes && characterLength(params.notes) > 500) {
      throw new Error('Notes exceed maximum length of 500 characters')
    }

    for (const categoryId of params.categoryIds ?? []) {
      validateUUID(categoryId, 'categoryIds')
    }

    if (
      params.feePriority !== undefined &&
      !Object.values(FeePriority).includes(params.feePriority)
    ) {
      throw new Error(
        `Invalid fee priority: ${params.feePriority}. Must be one of: ${Object.values(FeePriority).join(', ')}`
      )
    }

    this.log(`Requesting withdrawal from wallet ${walletId}`)
    const response = await this.apiService.requestWithdrawal(walletId, params, options)
    this.log(`Withdrawal request completed, auto_approved: ${response.auto_approved}`)

    return response
  }

  /**
   * Gets the latest status/details for a withdrawal
   * @param walletId The ID of the wallet that owns the withdrawal
   * @param withdrawalId The ID of the withdrawal
   * @returns Promise with withdrawal details including the latest status
   */
  async getWithdrawalStatus(walletId: string, withdrawalId: string): Promise<Withdrawal> {
    validateUUID(walletId, 'walletId')
    validateUUID(withdrawalId, 'withdrawalId')

    const response = await this.apiService.getWithdrawalStatus(walletId, withdrawalId)

    return response
  }

  /**
   * Gets the webhook public key for a workspace
   * @param workspaceId The workspace ID
   * @returns Promise with webhook public key (hex encoded ed25519 public key, as verifyEd25519 expects)
   */
  async getWebhookPublicKey(workspaceId: string): Promise<WebhookPublicKeyResponse> {
    validateUUID(workspaceId, 'workspaceId')

    this.log(`Getting webhook public key for workspace ${workspaceId}`)
    const response = await this.apiService.getWebhookPublicKey(workspaceId)
    return response
  }

  /** @internal */
  _getApiService(): APIService {
    return this.apiService
  }

  /** @internal */
  _log(message: string): void {
    this.log(message)
  }

  /** @internal */
  _getWorkspaceId(): string {
    if (!this.workspaceId) {
      throw new Error('Workspace ID is required. Please set workspaceId in the constructor.')
    }
    return this.workspaceId
  }
}

class AutomationNamespace {
  private sdk: FystackSDK

  constructor(sdk: FystackSDK) {
    this.sdk = sdk
  }

  async createSweepTask(params: CreateSweepTaskParams): Promise<SweepTaskResponse> {
    const workspaceId = this.sdk._getWorkspaceId()

    validateUUID(params.destinationWalletId, 'destinationWalletId')
    for (const walletId of params.walletIds) {
      validateUUID(walletId, 'walletIds')
    }
    if (params.assetIds) {
      for (const assetId of params.assetIds) {
        validateUUID(assetId, 'assetIds')
      }
    }

    this.sdk._log(`Creating sweep task "${params.name}" for workspace ${workspaceId}`)
    const response = await this.sdk._getApiService().createSweepTask(workspaceId, params)
    this.sdk._log(`Sweep task created with ID: ${response.id}`)
    return response
  }
}
