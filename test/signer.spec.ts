import { JsonRpcProvider, ethers } from 'ethers'
import { describe, test, expect } from 'vitest'
import { EtherSigner, Environment, FystackSDK } from '../src'

describe('Signer', () => {
  const apiCredentials = {
    apiKey: import.meta.env.VITE_API_KEY_PROD,
    apiSecret: import.meta.env.VITE_API_SECRET_PROD
  }

  test('test get address', async () => {
    const signer = new EtherSigner(apiCredentials, Environment.Local)
    signer.setWallet('9de41256-32e0-4ed8-b038-bd8ab89c2e2a')
    const address = await signer.getAddress()
    expect(address).toBe('0x83256dd90A8Fc7979D7e19cC6d33d0b1B10bb356')
  })

  test('test sign transaction', async () => {
    const sdk = new FystackSDK({
      credentials: apiCredentials,
      environment: Environment.Local,
      workspaceId: 'fa0cbc2a-0dc8-4cd2-9f03-3ad9423787f4',
      logger: true
    })

    const wallets = await sdk.getWallets()
    console.log('wallets', wallets)
    const provider = new JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com')

    const signer = new EtherSigner(apiCredentials, Environment.Local, provider)
    signer.setWallet(wallets[0].id)

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
