// Wallets
export enum WalletType {
  Standard = 'standard',
  MPC = 'mpc'
}

export enum WalletPurpose {
  General = 'general',
  Gastank = 'gas_tank',
  Deployment = 'deployment',
  Custody = 'custody',
  User = 'user',
  Payment = 'payment'
}

export enum WalletCreationStatus {
  Pending = 'pending',
  Success = 'success',
  Error = 'error'
}

export enum AddressType {
  Evm = 'evm',
  Solana = 'sol',
  Tron = 'tron'
}

export enum DestinationType {
  InternalWallet = 'internal_wallet',
  AddressBook = 'address_book'
}

export enum TxStatus {
  Pending = 'pending',
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
