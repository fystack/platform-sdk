const API = {
  baseURL: 'https://apex.void.exchange',
  endpoints: {
    transaction: (walletId: string) => `/web3/transaction/${walletId}/signRaw`,
    getWalletInfo: (apiKey: string) => ''
  }
}

export default {
  API
}
