/**
 * All granular permission IDs used across the admin dashboard.
 * Single source of truth — import from here, never hardcode strings.
 */
export const PERMISSIONS = {
  // Users
  USERS_VIEW: 'users.view',
  USERS_EDIT: 'users.edit',
  USERS_SUSPEND: 'users.suspend',
  USERS_DELETE: 'users.delete',
  USERS_EXPORT: 'users.export',

  // Gift Cards
  GIFTCARDS_VIEW: 'giftcards.view',
  GIFTCARDS_APPROVE: 'giftcards.approve',
  GIFTCARDS_REJECT: 'giftcards.reject',
  GIFTCARDS_FLAG: 'giftcards.flag',
  GIFTCARDS_EXPORT: 'giftcards.export',

  // Withdrawals
  WITHDRAWALS_VIEW: 'withdrawals.view',
  WITHDRAWALS_APPROVE: 'withdrawals.approve',
  WITHDRAWALS_REJECT: 'withdrawals.reject',
  WITHDRAWALS_EXPORT: 'withdrawals.export',

  // Rates
  RATES_VIEW: 'rates.view',
  RATES_CREATE: 'rates.create',
  RATES_EDIT: 'rates.edit',
  RATES_DELETE: 'rates.delete',

  // Finance
  FINANCE_VIEW: 'finance.view',
  FINANCE_EXPORT: 'finance.export',

  // Fraud
  FRAUD_VIEW: 'fraud.view',
  FRAUD_INVESTIGATE: 'fraud.investigate',
  FRAUD_RESOLVE: 'fraud.resolve',
  FRAUD_BLOCK: 'fraud.block',

  // Logs
  LOGS_VIEW: 'logs.view',
  LOGS_EXPORT: 'logs.export',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',

  // Roles
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_EDIT: 'roles.edit',
  ROLES_DELETE: 'roles.delete',
  ROLES_ASSIGN: 'roles.assign',

  // Banners
  BANNERS_VIEW: 'banners.view',
  BANNERS_MANAGE: 'banners.manage',
} as const;

export type PermissionId = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
