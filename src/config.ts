enum Environment {
  Local = 'local',
  Sandbox = 'sandbox',
  Production = 'production'
}

// Define the API routes structure
export interface APIEndpoints {
  signTransaction: (walletId: string) => string
  requestSign: (walletId: string) => string
  getSignStatus: (walletId: string, transactionId: string) => string
  getTransactionStatus: (walletId: string, transactionId: string) => string
  getWalletDetail: (walletId?: string) => string
  createWallet: () => string
  createCheckout: () => string
  getCheckout: (checkoutId: string) => string
  createCheckoutPayment: (checkoutId: string) => string
  getCheckoutPayment: (checkoutId: string) => string
  getWalletCreationStatus: (walletId: string) => string
  getWalletAssets: (walletId: string) => string
  getDepositAddress: (walletId: string, addressType: string) => string
  rescanTransaction: () => string
}

const getBaseURL = (env: Environment): string => {
  switch (env) {
    case Environment.Local:
      return 'http://localhost:8150'
    case Environment.Sandbox:
      return 'https://api-dev.fystack.io'
    case Environment.Production:
      return 'https://api.fystack.io'
  }
}

export interface APIConfig {
  baseURL: string
  endpoints: APIEndpoints
}

const createAPI = (env: Environment): APIConfig => {
  const baseURL = `${getBaseURL(env)}/api/v1`

  const withBaseURL = (path: string) => `${baseURL}${path}`

  return {
    baseURL,
    endpoints: {
      signTransaction: (walletId: string) => withBaseURL(`/web3/transaction/${walletId}/signRaw`),
      getWalletDetail: (walletId?: string) =>
        walletId
          ? withBaseURL(`/web3/wallet-detail/${walletId}`)
          : withBaseURL('/web3/wallet-detail'),
      createWallet: () => withBaseURL('/wallets'),
      createCheckout: () => withBaseURL('/checkouts'),
      getCheckout: (checkoutId: string) => withBaseURL(`/checkouts/${checkoutId}`),
      createCheckoutPayment: (checkoutId: string) =>
        withBaseURL(`/checkouts/${checkoutId}/payment`),
      getCheckoutPayment: (checkoutId: string) => withBaseURL(`/checkouts/payment/${checkoutId}`),

      // New endpoints for signing and transaction status
      requestSign: (walletId: string) => withBaseURL(`/web3/${walletId}/sign`),
      getSignStatus: (walletId: string, transactionId: string) =>
        withBaseURL(`/web3/${walletId}/sign/${transactionId}`),
      getTransactionStatus: (walletId: string, transactionId: string) =>
        withBaseURL(`/web3/transaction/${walletId}/${transactionId}`),
      getWalletCreationStatus: (walletId: string) =>
        withBaseURL(`/wallets/creation-status/${walletId}`),
      getWalletAssets: (walletId: string) => withBaseURL(`/wallets/${walletId}/assets`),
      getDepositAddress: (walletId: string, addressType: string) =>
        withBaseURL(`/wallets/${walletId}/deposit-address?address_type=${addressType}`),
      rescanTransaction: () => withBaseURL('/networks/rescan-transaction')
    }
  }
}

export { Environment, createAPI }
