export type GiftCardStatus = 'pending' | 'processing' | 'completed' | 'rejected' | 'flagged';
export type CardType = 'ecode' | 'physical';

export interface GiftCardTransaction {
  id: string;
  userId: string;
  user: { id: string; fullName: string; email: string };
  brandId: string;
  brandName: string;
  brand: { logoUrl: string; category: string };
  productId: string | null;
  countryCode: string;
  cardType: CardType;
  amount: number;
  rate: number;
  payout: number;
  status: GiftCardStatus;
  eCode: string | null;
  imageUrl: string | null;
  note: string | null;
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  flagged: boolean;
  flagReason: string | null;
  reference: string;
  createdAt: string;
  updatedAt: string;
}

export interface GiftCardRate {
  id: string;
  brandId: string;
  brand: { id: string; name: string; logoUrl: string };
  productId: string | null;
  product: {
    id: string;
    productName: string;
    currency: string;
    productType: 'FIXED' | 'RANGE';
  } | null;
  countryCode: string;
  cardType: CardType;
  ratePerUnit: number;
  currency: string;
  minAmount: number | null;
  maxAmount: number | null;
  isActive: boolean;
  updatedAt: string;
  updatedByAdmin: { id: string; fullName: string };
}

export interface GiftCardBrand {
  id: string;
  reloadlyId: number;
  name: string;
  category: string;
  logoUrl: string;
  isActive: boolean;
  sortOrder: number;
  supportedCountries: string[];
  createdAt: string;
  updatedAt: string;
  _count?: { products: number; rates: number };
}

export interface UpdateTransactionStatusDto {
  status: GiftCardStatus;
  adminNote?: string;
}

export interface SetRateDto {
  brandId: string;
  countryCode: string;
  cardType: CardType;
  ratePerUnit: number;
  currency: string;
}

// ─── Country (Reloadly-synced) ────────────────────────────────────────────────

export interface Country {
  id: string;
  code: string;             // ISO alpha-2, e.g. "US"
  name: string;             // human-readable, e.g. "United States"
  isoName: string | null;   // raw isoName from Reloadly (often equals code)
  flag: string | null;      // emoji or CDN URL
  currencyCode: string | null;
  currencyName: string | null;
  currencySymbol: string | null;
  callingCodes: string[];
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Catalog (Reloadly-synced) ────────────────────────────────────────────────

export interface GiftCardProduct {
  id: string;
  brandId: string;
  productName: string;
  countryCode: string;
  currency: string;
  productType: 'FIXED' | 'RANGE';
  fixedAmounts: number[];
  minAmount: number | null;
  maxAmount: number | null;
  logoUrl: string | null;
  isActive: boolean;
  lastSyncedAt: string | null;
  brand?: { id: string; name: string; logoUrl: string; isActive: boolean };
}

export type ReloadlySyncStatus = 'running' | 'success' | 'failed';

export interface ReloadlySyncLog {
  id: string;
  type: 'full' | 'countries_only';
  status: ReloadlySyncStatus;
  triggeredBy: string | null;
  countriesProcessed: number;
  countriesFailed: number;
  brandsUpserted: number;
  productsUpserted: number;
  durationMs: number | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface ReloadlySyncStatusResponse {
  lastSyncedAt: string | null;
  lastRun: ReloadlySyncLog | null;
  configured: boolean;
  baseUrl: string;
}

export interface ReloadlySyncResult {
  brandsUpserted: number;
  productsUpserted: number;
  countriesProcessed: number;
  countriesFailed: number;
  durationMs: number;
  syncedAt: string;
  syncLogId: string;
}
