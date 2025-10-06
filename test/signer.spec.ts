import { JsonRpcProvider, ethers } from 'ethers'
import { describe, test, expect } from 'vitest'
import { EtherSigner, Environment } from '../src'

describe('Signer', () => {
  const apiCredentials = {
    apiKey: '',
    apiSecret: '',
    authToken: ''
  }

  test('test get address', async () => {
    const signer = new EtherSigner(apiCredentials, Environment.Local)
    const address = await signer.getAddress()
    expect(address).toBe('0x512E683Dd57AdFD87B09D7D7D533Fe0FaBA4C125')
  })

  test('test sign transaction', async () => {
    const signer = new EtherSigner(apiCredentials, Environment.Local)
    const provider = new JsonRpcProvider('https://eth-sepolia.public.blastapi.io')
    const signerWithProvider = signer.connect(provider)

    const tx = await signerWithProvider.sendTransaction({
      to: '0xe6EBF81E9C225BbCEa9b5399E0D0d0f29f30f119',
      value: ethers.parseEther('0.0000001') // 1 ETH
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
