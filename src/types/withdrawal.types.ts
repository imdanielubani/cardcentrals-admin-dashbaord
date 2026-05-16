export type WithdrawalStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'reversed';

export interface Withdrawal {
  id: string;
  userId: string;
  user: { id: string; fullName: string; email: string };
  amount: number;
  status: WithdrawalStatus;
  bankName: string;
  accountNumber: string;
  accountName: string;
  reference: string;
  paystackRef: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateWithdrawalDto {
  status: WithdrawalStatus;
  adminNote?: string;
}
