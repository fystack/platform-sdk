import { beforeEach, describe, expect, test, vi } from 'vitest'
import fetch from 'cross-fetch'
import { Environment, FystackSDK, WithdrawalStatus } from '../src'

vi.mock('cross-fetch', () => ({
  default: vi.fn()
}))

describe('Withdrawal status', () => {
  const mockFetch = vi.mocked(fetch)
  const walletId = '11111111-1111-4111-8111-111111111111'
  const withdrawalId = '22222222-2222-4222-8222-222222222222'

  beforeEach(() => {
    mockFetch.mockReset()
  })

  test('gets withdrawal status by wallet and withdrawal ID', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          id: withdrawalId,
          created_at: '2026-07-04T00:00:00Z',
          updated_at: '2026-07-04T00:00:00Z',
          amount: '10.5',
          status: WithdrawalStatus.Pending,
          recipient_address: '0xRecipientAddress',
          withdrawal_approvals: [],
          creator_id: '33333333-3333-4333-8333-333333333333',
          asset_id: '44444444-4444-4444-8444-444444444444',
          wallet_id: walletId,
          asset_hold_id: '55555555-5555-4555-8555-555555555555'
        }
      })
    } as any)

    const sdk = new FystackSDK({
      credentials: {
        apiKey: 'test-api-key',
        apiSecret: '',
        authToken: 'Bearer test-token'
      },
      environment: Environment.Production
    })

    const response = await sdk.getWithdrawalStatus(walletId, withdrawalId)

    expect(response.id).toBe(withdrawalId)
    expect(response.status).toBe(WithdrawalStatus.Pending)
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.fystack.io/api/v1/wallets/${walletId}/withdrawals/${withdrawalId}`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token'
        })
      })
    )
  })
})
