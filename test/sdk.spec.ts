import { describe, test } from 'vitest'
import { APIService, WalletType } from '../src/api'

describe('SDK', () => {
  const apiCredentials = {
    APIKey: '46f2a098-5c66-413b-b03c-2aa5871b8d4e',
    APISecret: 'ce56de6770e96c5e0d9a075784fb4589'
  }

  test('create new wallet', async () => {
    const apiService = new APIService(apiCredentials)
    await apiService.createWallet({
      WorkspaceID: '6bcfe6c7-281b-4773-a188-e78f5cad3336',
      Name: 'generated_wallet',
      WalletType: WalletType.Standard
    })
  })
})
