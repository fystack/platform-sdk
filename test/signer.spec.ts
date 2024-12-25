import { JsonRpcProvider, ethers } from 'ethers'
import { describe, test, expect } from 'vitest'
import { ApexSigner } from '../src/signer'

describe('Signer', () => {
  const apiCredentials = {
    APIKey: '46f2a098-5c66-413b-b03c-2aa5871b8d4e',
    APISecret: 'ce56de6770e96c5e0d9a075784fb4589'
  }

  test('test get address', async () => {
    const signer = new ApexSigner(apiCredentials)

    const address = await signer.getAddress()
    expect(address).toBe('0x06A388F07F0EB0605D57947A7F1856a5e091940b')
  })

  test('test sign transaction', async () => {
    const signer = new ApexSigner(apiCredentials)
    const provider = new JsonRpcProvider(
      'https://eth-sepolia.blastapi.io/dc856d31-b388-47b0-bae4-efd51cee0ab6'
    )
    const signerWithProvider = signer.connect(provider)

    const tx = await signerWithProvider.sendTransaction({
      to: '0xe6EBF81E9C225BbCEa9b5399E0D0d0f29f30f119',
      value: ethers.parseEther('0.0000001') // 1 ETH
    })

    console.log('tx', tx)
  })
})
