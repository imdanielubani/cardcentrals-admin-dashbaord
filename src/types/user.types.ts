export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  isEmailVerified: boolean;
  status: 'active' | 'suspended' | 'deleted';
  avatarUrl: string | null;
  createdAt: string;
  wallet: { availableBalance: number } | null;
  lastActiveAt?: string | null;
  _count?: { giftCardTxns: number; withdrawals: number };
}

export interface AdminUserGiftCardTxn {
  id: string;
  brandName: string;
  brandLogo?: string | null;
  amount: number;
  payout: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'flagged';
  createdAt: string;
  reference: string;
}

export interface AdminUserWithdrawal {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'reversed';
  bankName: string | null;
  accountNumber: string | null;
  createdAt: string;
  reference: string;
}

export interface AdminUserDetail extends AdminUser {
  updatedAt: string;
  lastActiveAt: string | null;
  wallet: {
    availableBalance: number;
    totalCredited: number;
    totalWithdrawn: number;
  } | null;
  giftCardTxns: AdminUserGiftCardTxn[];
  withdrawals: AdminUserWithdrawal[];
}

export interface AdminStats {
  users: {
    total: number;
    active: number;
    suspended: number;
  };
  giftCards: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    rejected: number;
    flagged: number;
    completedVolume: number;
  };
  withdrawals: {
    total: number;
    pending: number;
    paid: number;
    paidVolume: number;
  };
  wallets: {
    totalAvailableBalance: number;
    totalCredited: number;
    totalWithdrawn: number;
  };
}
