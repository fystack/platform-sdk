import { JsonRpcProvider, ethers } from 'ethers'
import { describe, test, expect } from 'vitest'
import { ApexSigner } from '../src/signer'

describe('Signer', () => {
  const apiCredentials = {
    APIKey: 'e1426277-c099-459c-ad1f-bf0b9bca3109',
    APISecret: 'c3c6aa8121b84d3aae4a4558956ee171'
  }

  test('test get address', async () => {
    const signer = new ApexSigner(apiCredentials)

    const address = await signer.getAddress()
    expect(address).toBe('0x57aaEbEAfe63f81c18AE63FbF9C1E2C01C274bbb')
  })

  test('test sign transaction', async () => {
    const signer = new ApexSigner(apiCredentials)
    const provider = new JsonRpcProvider(
      'https://eth-goerli.blastapi.io/dd4d7bd5-bc9b-49af-a16b-722800947444'
    )
    const signerWithProvider = signer.connect(provider)

    const tx = await signerWithProvider.sendTransaction({
      to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      value: ethers.parseEther('0.0012') // 1 ETH
    })

    console.log('tx', tx)
  })
})
