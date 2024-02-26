import { JsonRpcProvider, ethers } from 'ethers'
import { describe, test, expect } from 'vitest'
import { ApexSigner } from '../src/signer'

describe('Signer', () => {
  const apiCredentials = {
    APIKey: 'e9958e9e-7469-455a-82af-6087d9c8cc1b',
    APISecret: 'de70e199ffae829b5aa9daf86172404a'
  }

  test('test get address', async () => {
    const signer = new ApexSigner(apiCredentials)

    const address = await signer.getAddress()
    expect(address).toBe('0xF3a58765cD7174E955B242B5c46b16308039B8DC')
  })

  test('test sign transaction', async () => {
    const signer = new ApexSigner(apiCredentials)
    const provider = new JsonRpcProvider(
      'https://eth-goerli.blastapi.io/dd4d7bd5-bc9b-49af-a16b-722800947444'
    )
    const signerWithProvider = signer.connect(provider)

    const tx = await signerWithProvider.sendTransaction({
      to: '0xe6EBF81E9C225BbCEa9b5399E0D0d0f29f30f119',
      value: ethers.parseEther('0.0013') // 1 ETH
    })

    console.log('tx', tx)
  })
})
