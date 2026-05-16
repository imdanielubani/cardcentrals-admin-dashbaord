import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, setToken, clearAuth, TOKEN_KEY, ADMIN_KEY } from "../../lib/api";

// ─── Permission Modules (used by SettingsPage / Admin pages for gating UI) ───
//
// The backend's authoritative role enum is superadmin | admin | support.
// These permission ids are mapped to those roles below — they give us
// fine-grained gates on the client without changing the backend contract.

export const permissionModules = [
  {
    id: "users",
    label: "Users",
    description: "Manage user accounts",
    permissions: [
      { id: "users.view", label: "View Users" },
      { id: "users.edit", label: "Edit Users" },
      { id: "users.suspend", label: "Suspend / Block" },
      { id: "users.delete", label: "Delete Users" },
      { id: "users.export", label: "Export Users" },
    ],
  },
  {
    id: "giftcards",
    label: "Giftcards",
    description: "Manage gift card submissions",
    permissions: [
      { id: "giftcards.view", label: "View Submissions" },
      { id: "giftcards.approve", label: "Approve Cards" },
      { id: "giftcards.reject", label: "Reject Cards" },
      { id: "giftcards.flag", label: "Flag for Review" },
      { id: "giftcards.export", label: "Export Data" },
    ],
  },
  {
    id: "withdrawals",
    label: "Withdrawals",
    description: "Process withdrawal requests",
    permissions: [
      { id: "withdrawals.view", label: "View Withdrawals" },
      { id: "withdrawals.approve", label: "Approve Withdrawals" },
      { id: "withdrawals.reject", label: "Reject Withdrawals" },
      { id: "withdrawals.export", label: "Export Data" },
    ],
  },
  {
    id: "rates",
    label: "Rates",
    description: "Manage exchange rates and brands",
    permissions: [
      { id: "rates.view", label: "View Rates" },
      { id: "rates.create", label: "Add Brands" },
      { id: "rates.edit", label: "Edit Rates" },
      { id: "rates.delete", label: "Delete Brands" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    description: "Financial overview and ledger",
    permissions: [
      { id: "finance.view", label: "View Finance" },
      { id: "finance.export", label: "Export Ledger" },
    ],
  },
  {
    id: "fraud",
    label: "Fraud Monitor",
    description: "Fraud detection and alerts",
    permissions: [
      { id: "fraud.view", label: "View Alerts" },
      { id: "fraud.investigate", label: "Investigate" },
      { id: "fraud.resolve", label: "Resolve / Dismiss" },
    ],
  },
  {
    id: "logs",
    label: "Activity Logs",
    description: "Admin activity tracking",
    permissions: [
      { id: "logs.view", label: "View Logs" },
      { id: "logs.export", label: "Export Logs" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    description: "Platform configuration",
    permissions: [
      { id: "settings.view", label: "View Settings" },
      { id: "settings.edit", label: "Edit Settings" },
    ],
  },
  {
    id: "banners",
    label: "Banners",
    description: "Mobile app banner management",
    permissions: [
      { id: "banners.view", label: "View Banners" },
      { id: "banners.manage", label: "Manage Banners" },
    ],
  },
];

export const allPermissionIds = permissionModules.flatMap((m) =>
  m.permissions.map((p) => p.id),
);

// ─── Role → permission-set map ────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  superadmin: [...allPermissionIds],
  admin: [
    "users.view", "users.edit", "users.suspend", "users.export",
    "giftcards.view", "giftcards.approve", "giftcards.reject", "giftcards.flag", "giftcards.export",
    "withdrawals.view", "withdrawals.approve", "withdrawals.reject", "withdrawals.export",
    "rates.view", "rates.create", "rates.edit",
    "finance.view", "finance.export",
    "fraud.view", "fraud.investigate", "fraud.resolve",
    "logs.view", "logs.export",
    "settings.view",
    "banners.view",
  ],
  support: [
    "giftcards.view", "giftcards.flag",
    "withdrawals.view",
    "users.view",
    "logs.view",
  ],
};

// ─── Display metadata per backend role ───────────────────────────────────────

export interface RoleDisplay {
  id: string;            // backend enum value
  name: string;          // pretty name
  description: string;
  color: string;
  permissions: string[];
}

const ROLE_DISPLAY: Record<string, Omit<RoleDisplay, "permissions">> = {
  superadmin: {
    id: "superadmin",
    name: "Super Admin",
    description: "Full access to all platform features and settings.",
    color: "#0159C7",
  },
  admin: {
    id: "admin",
    name: "Admin",
    description: "Core operations: users, gift cards, withdrawals, rates, finance, fraud.",
    color: "#22C55E",
  },
  support: {
    id: "support",
    name: "Support Agent",
    description: "View and flag gift cards and withdrawals. View-only on users.",
    color: "#F59E0B",
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthenticatedAdmin {
  id: string;
  fullName: string;
  email: string;
  role: "superadmin" | "admin" | "support";
}

interface AuthContextType {
  currentAdmin: AuthenticatedAdmin | null;
  permissions: string[];
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permissionId: string) => boolean;
  hasAnyPermission: (permissionIds: string[]) => boolean;
  // Legacy compat — exposed for components (AdminLayout, NotificationPanel) that read these
  currentUser: AuthenticatedAdmin | null;
  currentRole: RoleDisplay | null;
}

const AdminAuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [currentAdmin, setCurrentAdmin] = useState<AuthenticatedAdmin | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const stored = localStorage.getItem(ADMIN_KEY);
      if (token && stored) {
        const admin = JSON.parse(stored) as AuthenticatedAdmin;
        setCurrentAdmin(admin);
      }
    } catch {
      clearAuth();
    }
    setIsSessionLoading(false);
  }, []);

  const permissions = currentAdmin
    ? (ROLE_PERMISSIONS[currentAdmin.role] ?? [])
    : [];

  const isAuthenticated = currentAdmin !== null;

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const data = await api.post<{ token: string; admin: AuthenticatedAdmin }>(
          "/admin/auth/login",
          { email, password },
        );
        setToken(data.token);
        localStorage.setItem(ADMIN_KEY, JSON.stringify(data.admin));
        setCurrentAdmin(data.admin);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Login failed",
        };
      }
    },
    [],
  );

  const logout = useCallback(() => {
    // Fire-and-forget: still clear local state if the network call fails
    api.post("/admin/auth/logout", {}).catch(() => {});
    clearAuth();
    setCurrentAdmin(null);
  }, []);

  const hasPermission = useCallback(
    (permissionId: string): boolean => permissions.includes(permissionId),
    [permissions],
  );

  const hasAnyPermission = useCallback(
    (permissionIds: string[]): boolean =>
      permissionIds.some((p) => permissions.includes(p)),
    [permissions],
  );

  const currentRole: RoleDisplay | null = currentAdmin
    ? {
        ...ROLE_DISPLAY[currentAdmin.role],
        permissions,
      }
    : null;

  return (
    <AdminAuthContext.Provider
      value={{
        currentAdmin,
        permissions,
        isAuthenticated,
        isSessionLoading,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        currentUser: currentAdmin,
        currentRole,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
