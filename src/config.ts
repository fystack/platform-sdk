const API = {
  baseURL: 'https://apex.void.exchange',
  // baseURL: 'http://localhost:8150',
  endpoints: {
    signTransaction: (walletId: string) => `/api/v1/web3/transaction/${walletId}/signRaw`,
    getWalletDetail: () => '/api/v1/web3/wallet-detail',
    createWallet: () => '/api/v1/wallets',
    createCheckout: () => '/api/v1/checkouts'
  }
}

export default {
  API
}
