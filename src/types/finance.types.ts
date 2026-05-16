export interface WalletTransaction {
  id: string;
  walletId: string;
  wallet: {
    user: { id: string; fullName: string; email: string };
  };
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference: string;
  createdAt: string;
}
