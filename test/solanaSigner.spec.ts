import { describe, test, expect } from 'vitest'
import { SolanaSigner } from '../src/solanaSigner'
import { Environment } from '../src/config'
import { WalletAddressType } from '../src/api'
import { Connection, PublicKey, SystemProgram, Transaction, clusterApiUrl } from '@solana/web3.js'

describe('SolanaSigner', () => {
  const apiCredentials = {
    apiKey: '6cb8065c-6b36-428a-838f-cd729b5e8028',
    apiSecret: import.meta.env.API_SECRET
  }

  test('test sign transaction', async () => {
    const signer = new SolanaSigner(apiCredentials, Environment.Local)

    // Get the signer's address
    const fromAddress = await signer.getAddress()
    const fromPubkey = new PublicKey(fromAddress)

    // Create a destination address (this is just a random address for testing)
    const toAddress = '4LKprD1XvTuBupHqWXoS42XsEBHp7qALo3giDBRCNhAV'
    const toPubkey = new PublicKey(toAddress)

    // Connect to Solana devnet
    const connection = new Connection('https://api.mainnet-beta.solana.com/')

    async function getValidBlockhash() {
      // Use 'confirmed' to get a fresh blockhash with a high chance of being valid
      let { blockhash } = await connection.getLatestBlockhash({ commitment: 'finalized' })
      let { value: isValid } = await connection.isBlockhashValid(blockhash, {
        commitment: 'finalized'
      })

      while (!isValid) {
        console.log('Blockhash invalid, fetching a new one...')
        ;({ blockhash } = await connection.getLatestBlockhash({ commitment: 'finalized' }))
        ;({ value: isValid } = await connection.isBlockhashValid(blockhash, {
          commitment: 'finalized'
        }))
      }
      return blockhash
    }
    // Get the recent blockhash
    // const { blockhash } = await connection.getLatestBlockhash({ commitment: 'finalized' })

    const blockhash = await getValidBlockhash()
    console.log('blcokHahs', blockhash)
    // console.log('valid', valid)

    // Create a transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: 1000 // 0.0000001 SOL
    })

    // Create a transaction and add the instruction
    const transaction = new Transaction().add(transferInstruction)

    // Set the recent blockhash and fee payer
    transaction.recentBlockhash = blockhash
    transaction.feePayer = fromPubkey

    console.log('transaciton', transaction)
    console.log('recent blockhashh', blockhash)

    // Serialize the transaction to base64
    const serializedTransaction = transaction
      .serialize({
        requireAllSignatures: false,
        verifySignatures: false
      })
      .toString('base64')

    console.log('Serialized transaction:', serializedTransaction)

    try {
      // Sign the transaction
      const signature = await signer.signTransaction(serializedTransaction)
      console.log('Signature:', signature)
    } catch (error) {
      console.error('Error signing transaction:', error)
      throw error
    }
  })
})
