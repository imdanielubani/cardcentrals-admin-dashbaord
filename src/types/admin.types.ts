export interface AuditLog {
  id: string;
  adminId: string;
  admin: { id: string; fullName: string; email: string; role: string };
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  createdAt: string;
}

export interface AdminCountry {
  code: string;
  name: string;
  isActive: boolean;
  activeBrandsCount: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaLink: string;
  imageUrl: string | null;
  bgGradient: string;
  targetScreen: string;
  priority: number;
  status: 'active' | 'inactive' | 'scheduled';
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBannerDto {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaLink: string;
  imageUrl?: string;
  bgGradient: string;
  targetScreen: string;
  priority?: number;
  status?: 'active' | 'inactive' | 'scheduled';
  startDate?: string;
  endDate?: string;
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  withdrawalEnabled: boolean;
  giftCardEnabled: boolean;
  maxWithdrawalAmount: number;
  minWithdrawalAmount: number;
  supportEmail: string;
  supportPhone: string;
}
