import { useAdminAuth } from '../app/context/AdminAuthContext';

/**
 * Convenience hook — returns whether the current admin has a permission.
 *
 * @example
 * const canApprove = usePermission('giftcards.approve');
 */
export function usePermission(permissionId: string): boolean {
  const { hasPermission } = useAdminAuth();
  return hasPermission(permissionId);
}

/**
 * Returns true if the admin has ANY of the given permissions.
 */
export function useAnyPermission(permissionIds: string[]): boolean {
  const { hasAnyPermission } = useAdminAuth();
  return hasAnyPermission(permissionIds);
}
