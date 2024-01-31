import {
  AbstractSigner,
  TypedDataDomain,
  TypedDataField,
  Provider,
  defineProperties,
  Wallet,
  resolveProperties,
  resolveAddress,
  assertArgument,
  getAddress,
  Transaction,
  TransactionLike,
  TransactionResponse,
  TransactionResponseParams,
  assert,
  Signature
} from 'ethers'
import { TransactionRequest } from 'ethers/src.ts/providers'
import { computeHMAC } from './utils'
import api from './api'
import config from './config'

interface APICredentials {
  APIKey: string
  APISecret: string
}

export class ApexSigner extends AbstractSigner {
  readonly address!: string
  readonly credentials: APICredentials

  constructor(credentials: APICredentials, provider?: null | Provider) {
    super(provider)
  }

  async getAddress(): Promise<string> {
    const data = await api.get(config.API.endpoints.getWalletInfo(this.credentials.APIKey))
  }

  connect(provider: null | Provider): AbstractSigner {
    return new ApexSigner(this.credentials, provider)
  }

  // Copied and editted from ethers.js -> Wallet -> BaseWallet
  async signTransaction(tx: TransactionRequest): Promise<string> {
    // Replace any Addressable or ENS name with an address
    const { to, from } = await resolveProperties({
      to: tx.to ? resolveAddress(tx.to, this.provider) : undefined,
      from: tx.from ? resolveAddress(tx.from, this.provider) : undefined
    })

    if (to != null) {
      tx.to = to
    }
    if (from != null) {
      tx.from = from
    }

    if (tx.from != null) {
      assertArgument(
        getAddress(<string>tx.from) === this.address,
        'transaction from address mismatch',
        'tx.from',
        tx.from
      )
      delete tx.from
    }

    const fromAddress = await this.getAddress()
    console.info('Address', fromAddress)
    // Build the transaction
    const btx = Transaction.from(<TransactionLike<string>>tx)

    console.info('from', from)

    const data = {
      maxFeePerGas: btx.maxFeePerGas,
      maxPriorityFeePerGas: btx.maxPriorityFeePerGas,
      to: btx.to,
      from: fromAddress,
      nonce: btx.nonce,
      gasLimit: btx.gasLimit,
      data: btx.data,
      value: btx.value,
      chainId: btx.chainId,
      accessList: btx.accessList
    }

    console.info('Data', data)

    const currentTimestampInSeconds = Math.floor(Date.now() / 1000)
    const hmac = await computeHMAC(
      `method=POST&path=/api/v1/web3/transaction/7c4ce182-362c-47b1-adfc-d502864893a4/signRaw&timestamp=${currentTimestampInSeconds}&body=${JSON.stringify(
        data
      )}`
    )

    const signature = btoa(hmac)

    console.info('signature', signature)

    const resp = await axios.post(
      'http://localhost:8150/api/v1/web3/transaction/7c4ce182-362c-47b1-adfc-d502864893a4/signRaw',
      data,
      {
        headers: {
          'ACCESS-API-KEY': '77bd332b-548a-4102-8c88-9db86222a541',
          'ACCESS-TIMESTAMP': currentTimestampInSeconds,
          'ACCESS-SIGN': signature
        }
      }
    )
    //} catch (err: any) {
    //  throw err
    //  // console.info("resp", resp.data);
    //  //
    //  console.info("error", err.response.data);
    //}

    // console.info("btxxxxx", btx.toJSON());

    return btx.unsignedSerialized
  }
}

// new ApexSginer({
//  address: '0x1234567890123456789012345678901234567890',
// })
