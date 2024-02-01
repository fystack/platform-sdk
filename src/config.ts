const API = {
  baseURL: 'https://apex.void.exchange',
  endpoints: {
    signTransaction: (walletId: string) => `/api/v1/web3/transaction/${walletId}/signRaw`,
    getWalletDetail: (apiKey: string) => '/api/v1/web3/wallet-detail'
  }
}

export default {
  API
}
