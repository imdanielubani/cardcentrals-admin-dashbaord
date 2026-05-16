import cardcentralsLogo from "../../assets/cardcentrals-logo.svg";
import cardcentralsIcon from "../../assets/cardcentrals-logo-icon.svg";
import { NotificationPanel } from "./NotificationPanel";
import { Outlet, Link, useLocation, useNavigate, Navigate } from "react-router";
import { useState, useMemo, useCallback, type ElementType } from "react";
import { useAdminAuth, allPermissionIds } from "../../context/AdminAuthContext";
import {
  LayoutDashboard, Users, CreditCard, Banknote, TrendingUp, Shield,
  Activity, FileText, Settings, ChevronLeft, Menu, Search, LogOut,
  Image, Lock, ShieldAlert, ChevronDown, Globe, Package,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  icon: ElementType;
  permission: string | null;
  exact?: boolean;
}

interface NavSection {
  label: string | null;
  items: NavItem[];
}

// Nav items grouped by section with required permissions
const navSections: NavSection[] = [
  {
    label: null, // No section header for dashboard
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true, permission: null },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/users", label: "Users", icon: Users, permission: "users.view" },
      { to: "/giftcards", label: "Giftcards", icon: CreditCard, permission: "giftcards.view" },
      { to: "/withdrawals", label: "Withdrawals", icon: Banknote, permission: "withdrawals.view" },
      { to: "/rates", label: "Rates", icon: TrendingUp, permission: "rates.view" },
      { to: "/countries", label: "Countries", icon: Globe, permission: "rates.view" },
      { to: "/catalog", label: "Catalog", icon: Package, permission: "rates.view" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { to: "/finance", label: "Finance", icon: Activity, permission: "finance.view" },
      { to: "/fraud", label: "Fraud Monitor", icon: Shield, permission: "fraud.view" },
      { to: "/logs", label: "Activity Logs", icon: FileText, permission: "logs.view" },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/banners", label: "Banners", icon: Image, permission: "banners.view" },
      { to: "/settings", label: "Settings", icon: Settings, permission: "settings.view" },
    ],
  },
];

// Flat list for route permission checking
const allNavItems: NavItem[] = navSections.flatMap((s) => s.items);

// Map route paths to required permissions for route-level protection
const routePermissionMap: Record<string, string> = {
  "/users": "users.view",
  "/giftcards": "giftcards.view",
  "/withdrawals": "withdrawals.view",
  "/rates": "rates.view",
  "/countries": "rates.view",
  "/catalog": "rates.view",
  "/finance": "finance.view",
  "/fraud": "fraud.view",
  "/logs": "logs.view",
  "/banners": "banners.view",
  "/settings": "settings.view",
};

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showRoleInfo, setShowRoleInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, currentRole, isAuthenticated, isSessionLoading, hasPermission, logout } = useAdminAuth();

  // Searchable admin pages
  const searchablePages = useMemo(() => {
    if (!isAuthenticated || !currentUser || !currentRole) return [];
    return allNavItems
      .filter((item) => item.permission === null || hasPermission(item.permission!))
      .map((item) => ({ label: item.label, to: item.to }));
  }, [hasPermission, isAuthenticated, currentUser, currentRole]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return searchablePages.filter((p) => p.label.toLowerCase().includes(q));
  }, [searchQuery, searchablePages]);

  const isActive = useCallback((path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path), [location.pathname]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  // Filter nav sections
  const visibleSections = useMemo(() => {
    if (!currentRole) return [];
    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => item.permission === null || hasPermission(item.permission)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [currentRole, hasPermission]);

  const totalNavItemsCount = useMemo(() => allNavItems.filter((i) => i.permission !== null).length, []);
  const visibleNavCount = useMemo(() => visibleSections.flatMap((s) => s.items).filter((i) => i.permission !== null).length, [visibleSections]);
  const restrictedCount = totalNavItemsCount - visibleNavCount;

  const isRouteBlocked = useMemo(() => {
    if (!currentRole) return false;
    const requiredPermission = Object.entries(routePermissionMap).find(
      ([path]) => location.pathname === path || location.pathname.startsWith(path + "/")
    );
    return requiredPermission ? !hasPermission(requiredPermission[1]) : false;
  }, [location.pathname, currentRole, hasPermission]);

  const totalPermissions = currentRole?.permissions?.length ?? 0;

  // Wait for session to load before redirecting
  if (isSessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F7FB]">
        <div className="w-8 h-8 border-3 border-[#0159C7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !currentUser || !currentRole) {
    return <Navigate to="/login" replace />;
  }

  const SidebarContent = () => (
    <>
      <div className="p-5 flex items-center justify-between border-b border-white/10">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src={collapsed ? cardcentralsIcon : cardcentralsLogo}
            alt="Cardcentrals"
            className={collapsed ? "h-8 w-8" : "h-9"}
          />
        </Link>
        <button onClick={() => setCollapsed(!collapsed)} className="text-white/50 hover:text-white hidden lg:block">
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* User info & role in sidebar */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-white/10">
          <button
            onClick={() => setShowRoleInfo(!showRoleInfo)}
            className="w-full text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: currentRole.color }}>
                <span className="text-white" style={{ fontSize: 13, fontWeight: 700 }}>{currentUser.fullName[0]?.toUpperCase() ?? "A"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white truncate" style={{ fontSize: 13, fontWeight: 600 }}>{currentUser.fullName}</div>
                <div className="flex items-center gap-1">
                  <span
                    className="px-1.5 py-0.5 rounded-full"
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      backgroundColor: `${currentRole.color}30`,
                      color: currentRole.color,
                    }}
                  >
                    {currentRole.name.toUpperCase()}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-white/30 transition-transform ${showRoleInfo ? "rotate-180" : ""}`} />
                </div>
              </div>
            </div>
          </button>

          {/* Expandable role info */}
          {showRoleInfo && (
            <div className="mt-3 bg-white/5 rounded-xl p-3 space-y-2">
              <p className="text-white/50" style={{ fontSize: 11, lineHeight: 1.5 }}>
                {currentRole.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-white/30" style={{ fontSize: 10, fontWeight: 600 }}>PERMISSIONS</span>
                <span className="text-white/60" style={{ fontSize: 11, fontWeight: 600 }}>{totalPermissions} granted</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${(totalPermissions / allPermissionIds.length) * 100}%`, // 39 = total possible permissions
                    backgroundColor: currentRole.color,
                  }}
                />
              </div>
              {restrictedCount > 0 && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Lock className="w-3 h-3 text-white/20" />
                  <span className="text-white/30" style={{ fontSize: 10 }}>{restrictedCount} module(s) restricted</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <nav className="p-3 flex-1 space-y-0.5 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {visibleSections.map((section, sIdx) => (
          <div key={sIdx}>
            {/* Section label */}
            {section.label && !collapsed && (
              <div className="px-3 pt-4 pb-1.5">
                <span className="text-white/25" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>
                  {section.label.toUpperCase()}
                </span>
              </div>
            )}
            {section.label && collapsed && <div className="border-t border-white/5 my-2 mx-2" />}

            {section.items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isActive(item.to, item.exact ?? false)
                    ? "bg-[#0159C7] text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>}
              </Link>
            ))}
          </div>
        ))}

        {/* Restricted pages indicator */}
        {restrictedCount > 0 && !collapsed && (
          <div className="pt-2 mt-2 border-t border-white/5">
            <div className="flex items-center gap-2 px-3 py-2 text-white/20">
              <Lock className="w-4 h-4" />
              <span style={{ fontSize: 11 }}>{restrictedCount} restricted</span>
            </div>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:text-red-300 rounded-xl hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span style={{ fontSize: 14, fontWeight: 500 }}>Log Out</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#F5F7FB]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#272936] transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-[260px] bg-[#272936] flex flex-col">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-border px-4 lg:px-6 h-16 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-[#F5F7FB] rounded-xl px-4 py-2 relative">
              <Search className="w-4 h-4 text-[#6B7280]" />
              <input
                type="text"
                placeholder="Search pages..."
                className="bg-transparent border-none outline-none text-[#272936] w-48"
                style={{ fontSize: 14 }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              />
              {showSearchResults && searchQuery.trim() && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-border z-50 overflow-hidden">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-[#6B7280]" style={{ fontSize: 13 }}>No pages found</div>
                  ) : (
                    searchResults.map((r) => (
                      <button
                        key={r.to}
                        onMouseDown={(e) => { e.preventDefault(); navigate(r.to); setSearchQuery(""); setShowSearchResults(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#F5F7FB] text-[#272936] flex items-center gap-2 transition-colors"
                        style={{ fontSize: 13, fontWeight: 500 }}
                      >
                        <Search className="w-3.5 h-3.5 text-[#6B7280]" />
                        {r.label}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Role badge in header */}
            <span
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{
                fontSize: 11,
                fontWeight: 700,
                backgroundColor: `${currentRole.color}12`,
                color: currentRole.color,
              }}
            >
              <Shield className="w-3 h-3" />
              {currentRole.name}
            </span>
            <NotificationPanel />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: currentRole.color }}>
                <span className="text-white" style={{ fontSize: 13, fontWeight: 600 }}>{currentUser.fullName[0]?.toUpperCase() ?? "A"}</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-[#272936]" style={{ fontSize: 14, fontWeight: 500 }}>{currentUser.fullName}</div>
                <div className="text-[#6B7280]" style={{ fontSize: 11 }}>{currentRole.name}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          {isRouteBlocked ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 flex items-center justify-center mb-4">
                <ShieldAlert className="w-8 h-8 text-[#EF4444]" />
              </div>
              <h2 className="text-[#272936] mb-2" style={{ fontSize: 20, fontWeight: 700 }}>Access Denied</h2>
              <p className="text-[#6B7280] text-center max-w-md mb-6" style={{ fontSize: 14, lineHeight: 1.6 }}>
                You don't have permission to access this page. Your <strong>{currentRole.name}</strong> role does not include the required permissions.
              </p>
              <div className="bg-[#F5F7FB] rounded-xl p-4 mb-6 max-w-sm w-full">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4" style={{ color: currentRole.color }} />
                  <span className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>Your Role: {currentRole.name}</span>
                </div>
                <p className="text-[#6B7280]" style={{ fontSize: 12, lineHeight: 1.5 }}>{currentRole.description}</p>
              </div>
              <button
                onClick={() => navigate("/")}
                className="px-6 py-2.5 bg-[#0159C7] text-white rounded-xl hover:bg-[#014BA8] transition-colors"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}