import { describe, test, expect } from 'vitest'
import { APIService, Environment } from '../src'
import { verifyEd25519 } from '../src/utils'

describe('SDK', () => {
  const apiCredentials = {
    apiKey: '9fe2f4eb-c0af-4d7c-b682-c99418490bf6',
    apiSecret: ''
  }

  test('create new checkout', async () => {
    const apiService = new APIService(apiCredentials, Environment.Production)
    const event = {
      webhook_id: '73893532-8e3d-4bc7-b3f9-148c9b82b811',
      resource_id: 'c6702df0-b8ef-4a38-882d-dabf0d56127d',
      url: 'https://webhook.site/56e92433-823d-4b28-9cc9-9298076af671',
      payload: {
        amount: '1000',
        asset: null,
        asset_hold: null,
        asset_hold_id: null,
        asset_id: 'f1be472d-1338-43ff-b547-06faba7ecce7',
        block_number: 8960538,
        created_at: '2025-08-11T17:36:12+07:00',
        description: '',
        direction: 'in',
        from_address: '0xe6EBF81E9C225BbCEa9b5399E0D0d0f29f30f119',
        id: 'c6702df0-b8ef-4a38-882d-dabf0d56127d',
        method: 'transfer',
        network: null,
        network_id: '23d13c03-1f3c-4e2a-9aef-1771a244b7f6',
        omitempty: null,
        price_native_token: '4260.480000022453',
        price_token: '0.9997516371944777',
        status: 'confirmed',
        to_address: '0xA118fa3d039BA6ad3BB0bA8ac8F243F727B2F99F',
        tx_fee: '0.0000515434459912',
        tx_hash: '0x75789cbbe4d55328e6be7b7155b4028ea8afa384ffe13a1146d8bdb3eed6ba22',
        type: 'token_transfer',
        updated_at: '2025-08-11T17:36:28.532806+07:00',
        user: null,
        user_id: '075243c1-962e-4803-83da-d73c78b8b060',
        wallet: null,
        wallet_id: 'e0851607-417a-475a-b399-5f3aa262b81d',
        workspace: null,
        workspace_id: '6bcfe6c7-281b-4773-a188-e78f5cad3336'
      },
      event: 'deposit.confirmed'
    }
    const publickey = '503d18d8375e60667a4cdb879e72c249b3dc054e7d6443c5ccd93aef7f6547fb'
    const signature =
      '84bfb2defeb09c443204f2ab4002d983fc1873907613c4d63bad5a95eadf91e7ac7a29d0746f8a12295b0c3e54ea919c17c959a094e3da11529a29687a258204'

    const isValid = verifyEd25519(publickey, event, signature)
    expect(isValid).toBe(true)
  })
})
