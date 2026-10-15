// Wallets
export enum WalletType {
  Hyper = 'standard',
  MPC = 'mpc'
}

export enum WalletPurpose {
  General = 'general',
  Gastank = 'gas_tank',
  Deployment = 'deployment',
  Custody = 'custody',
  User = 'user',
  Payment = 'payment',
  OneTimeUse = 'one_time_use'
}

export enum WalletCreationStatus {
  Pending = 'pending',
  Success = 'success',
  Error = 'error'
}

export enum AddressType {
  Evm = 'evm',
  Bitcoin = 'btc',
  Solana = 'sol',
  Tron = 'tron'
}

export enum AddressStandard {
  BitcoinP2PKH = 'btc_p2pkh',
  BitcoinP2SH = 'btc_p2sh',
  BitcoinBech32 = 'btc_bech32',
  BitcoinP2PKHTestnet = 'btc_p2pkh_testnet',
  BitcoinP2SHTestnet = 'btc_p2sh_testnet',
  BitcoinBech32Testnet = 'btc_bech32_testnet'
}

export enum FeePriority {
  Low = 'low',
  Standard = 'standard',
  Fast = 'fast'
}

export enum DestinationType {
  InternalWallet = 'internal_wallet',
  AddressBook = 'address_book'
}

export enum TxStatus {
  Pending = 'pending',
  Broadcasting = 'broadcasting',
  Completed = 'completed',
  Confirmed = 'confirmed',
  Failed = 'failed',
  PendingApproval = 'pending_approval',
  Rejected = 'rejected'
}

export enum TxApprovalStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected'
}

export enum WalletRole {
  Admin = 'wallet_admin',
  Signer = 'wallet_signer',
  Viewer = 'wallet_viewer'
}

export enum WithdrawalStatus {
  PendingApproval = 'PENDING_APPROVAL',
  Cancelled = 'CANCELLED',
  Pending = 'PENDING',
  Failed = 'FAILED',
  Executed = 'EXECUTED',
  Success = 'SUCCESS',
  FundingGas = 'FUNDING_GAS',
  DeniedByPolicy = 'DENIED_BY_POLICY'
}

export enum SweepStrategy {
  Periodic = 'periodic'
}

export enum SweepType {
  Default = 'default',
  PaymentLink = 'payment_link',
  Checkout = 'checkout'
}

export enum ReserveType {
  FixedUsd = 'fixed_usd'
}
