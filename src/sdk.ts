import { APIService } from './api'
import { Environment } from './config'
import { StatusPoller } from './utils/statusPoller'
import {
  CreateWalletResponse,
  WalletCreationStatusResponse,
  WalletAsset,
  DepositAddressResponse,
  APICredentials,
  CreateWalletOptions
} from './types'
import { validateUUID } from './utils'
import { AddressType, WalletCreationStatus, WalletType } from './enum'

export interface SDKOptions {
  credentials: APICredentials
  environment?: Environment
  logger?: boolean
}

export class FystackSDK {
  private apiService: APIService
  private enableLogging: boolean

  constructor(options: SDKOptions) {
    const { credentials, environment = Environment.Production, logger = false } = options
    this.apiService = new APIService(credentials, environment)
    this.enableLogging = logger
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
    const { name, walletType = WalletType.Standard, sweepTaskParams, walletPurpose } = options

    const response = await this.apiService.createWallet({
      name,
      walletType,
      walletPurpose,
      sweepTaskParams
    })

    if (waitForCompletion && response.status === WalletCreationStatus.Pending) {
      return this.waitForWalletCreation(response.wallet_id)
    }

    return response
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
}
