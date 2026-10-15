import { describe, test, expect, vi, beforeEach } from 'vitest'
import fetch from 'cross-fetch'
import {
  APIError,
  APIService,
  EtherSigner,
  Environment,
  FystackSDK,
  StatusPoller,
  WalletPurpose,
  canonicalizeJSON,
  createAPI,
  computeHMAC,
  computeHMACForWebhook,
  verifyHMACForWebhook
} from '../src'

vi.mock('cross-fetch', () => ({ default: vi.fn() }))

const fetchMock = vi.mocked(fetch)
const walletId = '11111111-1111-4111-8111-111111111111'
const idempotencyKey = '6f1c2a7e-3b9d-4c1a-9e2f-8a4b5c6d7e8f'
const credentials = { apiKey: 'key', apiSecret: 'secret' }

function respond(body: unknown, status = 200) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
}

function lastRequest() {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]
  return {
    url: String(url),
    init: init as RequestInit,
    headers: init!.headers as Record<string, string>
  }
}

beforeEach(() => {
  fetchMock.mockReset()
})

describe('environment', () => {
  test('uses the enterprise sandbox URL', () => {
    expect(createAPI(Environment.Sandbox).baseURL).toBe(
      'https://api.enterprise-sandbox.fystack.io/api/v1'
    )
  })

  test('rejects an unknown environment', () => {
    expect(() => createAPI('staging' as Environment)).toThrow('Invalid environment')
  })
})

describe('request signing', () => {
  test('signs the exact body it sends and sends X-Idempotency-Key', async () => {
    fetchMock.mockImplementation(async () =>
      respond({ success: true, data: { auto_approved: true } })
    )
    const api = new APIService(credentials, Environment.Production)

    await api.requestWithdrawal(
      walletId,
      { assetId: walletId, amount: '1', recipientAddress: '0xabc' },
      { idempotencyKey }
    )

    const { init, headers } = lastRequest()
    expect(headers['X-Idempotency-Key']).toBe(idempotencyKey)
    const params = {
      method: 'POST',
      path: `/api/v1/wallets/${walletId}/request-withdrawal`,
      timestamp: headers['ACCESS-TIMESTAMP'],
      body: init.body as string
    }
    expect(headers['ACCESS-SIGN']).toBe(btoa(await computeHMAC('secret', params)))
  })

  test('sends X-Idempotency-Key with auth token credentials', async () => {
    fetchMock.mockImplementation(async () =>
      respond({ success: true, data: { transaction_id: 'tx' } })
    )
    const api = new APIService({ apiKey: '', authToken: 'Bearer token' }, Environment.Production)

    await api.signTransaction(walletId, { data: '0x' }, { idempotencyKey })

    const { headers } = lastRequest()
    expect(headers.Authorization).toBe('Bearer token')
    expect(headers['X-Idempotency-Key']).toBe(idempotencyKey)
  })

  test('encodes bigint values as decimal strings without a global patch', async () => {
    fetchMock.mockImplementation(async () =>
      respond({ success: true, data: { transaction_id: 'tx' } })
    )
    const api = new APIService(credentials, Environment.Production)

    await api.signTransaction(walletId, { value: 10n ** 18n, chainId: 137n })

    expect(lastRequest().init.body).toBe('{"value":"1000000000000000000","chainId":"137"}')
    expect((BigInt.prototype as any).toJSON).toBeUndefined()
  })
})

describe('errors', () => {
  test('API errors carry the status code', async () => {
    fetchMock.mockImplementation(async () =>
      respond({ success: false, message: 'Wallet not found' }, 404)
    )
    const api = new APIService(credentials, Environment.Production)

    const error = await api.getWalletAssets(walletId).catch((e) => e)
    expect(error).toBeInstanceOf(APIError)
    expect(error.statusCode).toBe(404)
    expect(error.message).toBe('Wallet not found')
  })

  test('non-JSON error responses become API errors', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>bad gateway</html>', { status: 502, statusText: 'Bad Gateway' })
    )
    const api = new APIService(credentials, Environment.Production)

    const error = await api.getWalletAssets(walletId).catch((e) => e)
    expect(error).toBeInstanceOf(APIError)
    expect(error.statusCode).toBe(502)
  })
})

describe('validation', () => {
  const sdk = new FystackSDK({ credentials, environment: Environment.Production })

  test('rejects wallet purposes Apex does not accept on create', async () => {
    await expect(
      sdk.createWallet({ name: 'w', walletPurpose: WalletPurpose.Deployment })
    ).rejects.toThrow('Invalid wallet purpose')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('counts characters, not UTF-16 units or bytes', async () => {
    fetchMock.mockImplementation(async () =>
      respond({ success: true, data: { auto_approved: true } })
    )
    const params = { assetId: walletId, amount: '1', recipientAddress: '0xabc' }

    await sdk.requestWithdrawal(walletId, { ...params, notes: 'ữ'.repeat(500) })
    await expect(
      sdk.requestWithdrawal(walletId, { ...params, notes: 'ữ'.repeat(501) })
    ).rejects.toThrow('Notes exceed')
    await expect(
      sdk.requestWithdrawal(walletId, { ...params, notes: '😀'.repeat(300) })
    ).resolves.toBeDefined()
  })
})

describe('EtherSigner', () => {
  const walletDetail = {
    success: true,
    data: { wallet_id: walletId, address: '0x000000000000000000000000000000000000dEaD' }
  }
  const tx = {
    to: '0x000000000000000000000000000000000000bEEF',
    value: 1n,
    nonce: 0,
    gasLimit: 21000n,
    chainId: 137n,
    maxFeePerGas: 100n,
    maxPriorityFeePerGas: 1n
  }

  test('sends chainId as a quoted decimal string', async () => {
    fetchMock
      .mockResolvedValueOnce(respond(walletDetail))
      .mockResolvedValueOnce(respond({ success: true, data: { transaction_id: 'tx-1' } }))
      .mockResolvedValueOnce(
        respond({
          success: true,
          data: { transaction_id: 'tx-1', status: 'confirmed', hash: '0xhash' }
        })
      )
    const signer = new EtherSigner(credentials, Environment.Production, null, { maxAttempts: 1 })
    signer.setWallet(walletId)

    await expect(signer.signTransaction({ ...tx })).resolves.toBe('0xhash')
    const body = JSON.parse(fetchMock.mock.calls[1][1]!.body as string)
    expect(body.chainId).toBe('137')
  })

  test('rejects legacy gasPrice transactions before calling the API', async () => {
    fetchMock.mockResolvedValueOnce(respond(walletDetail))
    const signer = new EtherSigner(credentials, Environment.Production)
    signer.setWallet(walletId)

    const { maxFeePerGas, maxPriorityFeePerGas, ...legacy } = tx
    await expect(signer.signTransaction({ ...legacy, gasPrice: 100n })).rejects.toThrow(
      'maxFeePerGas and maxPriorityFeePerGas are required'
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('reports a rejected transaction with its own error code', async () => {
    fetchMock
      .mockResolvedValueOnce(respond(walletDetail))
      .mockResolvedValueOnce(respond({ success: true, data: { transaction_id: 'tx-1' } }))
      .mockResolvedValueOnce(
        respond({ success: true, data: { transaction_id: 'tx-1', status: 'rejected' } })
      )
    const signer = new EtherSigner(credentials, Environment.Production, null, { maxAttempts: 1 })
    signer.setWallet(walletId)

    await expect(signer.signTransaction({ ...tx })).rejects.toMatchObject({
      code: 'TRANSACTION_REJECTED'
    })
  })

  test('connect keeps the selected wallet and the custom domain', async () => {
    fetchMock.mockResolvedValueOnce(respond(walletDetail))
    const signer = new EtherSigner(
      credentials,
      Environment.Production,
      null,
      undefined,
      'api.example.com'
    )
    signer.setWallet(walletId)

    await signer.connect(null).getAddress()
    expect(lastRequest().url).toBe(
      `https://api.example.com/api/v1/web3/wallet-detail/${walletId}?address_type=evm`
    )
  })
})

describe('webhooks', () => {
  const event = {
    webhook_id: 'id',
    resource_id: 'resource',
    url: 'https://x.io/hook?a=1&b=<2>',
    payload: { amount: 1.5, big: 100 },
    event: 'deposit.confirmed'
  }

  test('canonical JSON matches RFC 8785 as signed by Apex', () => {
    expect(canonicalizeJSON({ url: 'https://x.io/hook?a=1&b=<2>', amount: 1.5, big: 1e2 })).toBe(
      '{"amount":1.5,"big":100,"url":"https://x.io/hook?a=1&b=<2>"}'
    )
  })

  test('verifies HMAC signatures', async () => {
    const signature = await computeHMACForWebhook('secret', event)
    await expect(verifyHMACForWebhook('secret', event, signature)).resolves.toBe(true)
    await expect(verifyHMACForWebhook('secret', event, signature.slice(2))).resolves.toBe(false)
    await expect(verifyHMACForWebhook('secret', event, 'not-hex')).resolves.toBe(false)
  })
})

describe('StatusPoller', () => {
  test('does not wait after the final attempt and keeps defaults for undefined options', async () => {
    const poller = new StatusPoller({ maxAttempts: 1, interval: 5000, timeoutMs: undefined })
    const start = Date.now()

    await expect(
      poller.poll(
        async () => 'pending',
        () => false
      )
    ).rejects.toThrow('Maximum polling attempts (1) exceeded')
    expect(Date.now() - start).toBeLessThan(1000)
  })
})
