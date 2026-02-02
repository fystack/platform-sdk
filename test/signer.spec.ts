import { JsonRpcProvider, ethers } from 'ethers'
import { describe, test, expect } from 'vitest'
import { EtherSigner, Environment, FystackSDK } from '../src'

describe('Signer', () => {
  const apiCredentials = {
    apiKey: import.meta.env.VITE_API_KEY_SANDBOX,
    apiSecret: import.meta.env.VITE_API_SECRET_SANDBOX
  }

  test('test get address', async () => {
    const signer = new EtherSigner(apiCredentials, Environment.Sandbox)
    signer.setWallet('8d9d02b5-af83-43d7-b4be-7cd9729a6e64')
    const address = await signer.getAddress()
    expect(address).toBe('0xc9dF2A4398E09664d8e83Ba3FB4e1E4cab86831E')
  })

  test('test sign transaction', async () => {
    const sdk = new FystackSDK({
      credentials: apiCredentials,
      environment: Environment.Sandbox,
      workspaceId: '229681cb-ca36-4a66-bc04-9e7abcff85e1',
      logger: true
    })

    const wallets = await sdk.getWallets()
    console.log('wallets', wallets)
    const provider = new JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com')

    const signer = new EtherSigner(apiCredentials, Environment.Sandbox, provider)
    signer.setWallet('8d9d02b5-af83-43d7-b4be-7cd9729a6e64')

    const tx = await signer.sendTransaction({
      to: '0xe6EBF81E9C225BbCEa9b5399E0D0d0f29f30f119',
      value: ethers.parseEther('0.00001') // 1 ETH
    })

    console.log('tx response', tx.hash)
  })

  // test.only('local', async () => {
  //   const signer = new EtherSigner(
  //     {
  //       apiKey: '1f39673f-c29c-478b-990f-12dead05524d',
  //       apiSecret: 'ef306cbbe789be689f8d3bede8eb089d'
  //     },
  //     Environment.Local
  //   )
  //   const address = await signer.getAddress()
  //   console.log('address', address)

  //   const provider = new JsonRpcProvider('https://eth-sepolia.public.blastapi.io')
  //   const signerWithProvider = signer.connect(provider)
  //   const tx = await signerWithProvider.sendTransaction({
  //     to: '0xe6EBF81E9C225BbCEa9b5399E0D0d0f29f30f119',
  //     value: ethers.parseEther('0.0000001') // 1 ETH
  //   })
  // })
})
