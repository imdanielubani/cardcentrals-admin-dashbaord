import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Users,
  CreditCard,
  Banknote,
  Wallet,
  RefreshCw,
  Clock,
  ArrowRight,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Toaster, toast } from "sonner";

import {
  dashboardService,
  giftcardsService,
  withdrawalsService,
  logsService,
} from "../../../services";
import type {
  AdminStats,
  GiftCardTransaction,
  Withdrawal,
  AuditLog,
} from "../../../types";
import {
  PageHeader,
  StatCard,
  StatusBadge,
  EmptyState,
  PageLoader,
  ErrorState,
} from "../shared";
import { useAdminAuth } from "../../context/AdminAuthContext";

const formatNaira = (value: number): string =>
  `₦${(value ?? 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

const formatRelative = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

function BrandLogoCell({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const [errored, setErrored] = useState(false);
  const showImage = !!logoUrl && !errored;
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${showImage ? "bg-white border border-border" : "bg-[#EFF6FF]"}`}>
      {showImage ? (
        <img
          src={logoUrl!}
          alt={`${name} logo`}
          className="w-full h-full object-contain"
          onError={() => setErrored(true)}
        />
      ) : (
        <CreditCard className="w-5 h-5 text-[#0159C7]" />
      )}
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { currentAdmin } = useAdminAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentGiftCards, setRecentGiftCards] = useState<GiftCardTransaction[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<Withdrawal[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [statsRes, giftCards, withdrawals, logs] = await Promise.all([
        dashboardService.getStats(),
        giftcardsService.listTransactions(1, 8),
        withdrawalsService.list(1, 8, { status: "pending" }),
        logsService.list(1, 8),
      ]);
      setStats(statsRes);
      setRecentGiftCards(giftCards.data);
      setPendingWithdrawals(withdrawals.data);
      setRecentLogs(logs.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setIsRefreshing(true);
    await load();
    toast.success("Dashboard refreshed");
  };

  if (isLoading) return <PageLoader />;
  if (error && !stats) return <ErrorState message={error} onRetry={load} />;

  const welcomeName = currentAdmin?.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="p-6 space-y-6">
      <Toaster richColors position="top-right" />

      <PageHeader
        title={`Welcome back, ${welcomeName}`}
        subtitle="Real-time overview of the Cardcentrals platform"
        actions={
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl hover:bg-[#F5F7FB] transition-colors disabled:opacity-60"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            <RefreshCw className={`w-4 h-4 text-[#0159C7] ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {/* ── KPI Stat Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats?.users.total ?? 0}
          subtitle={`${stats?.users.active ?? 0} active · ${stats?.users.suspended ?? 0} suspended`}
          icon={<Users className="w-5 h-5 text-[#0159C7]" />}
          iconBg="#EFF6FF"
        />
        <StatCard
          title="Gift Card Transactions"
          value={stats?.giftCards.total ?? 0}
          subtitle={`${stats?.giftCards.pending ?? 0} pending · ${stats?.giftCards.flagged ?? 0} flagged`}
          icon={<CreditCard className="w-5 h-5 text-[#8B5CF6]" />}
          iconBg="#F5F3FF"
        />
        <StatCard
          title="Withdrawals Paid"
          value={formatNaira(stats?.withdrawals.paidVolume ?? 0)}
          subtitle={`${stats?.withdrawals.paid ?? 0} of ${stats?.withdrawals.total ?? 0} total`}
          icon={<Banknote className="w-5 h-5 text-[#22C55E]" />}
          iconBg="#F0FDF4"
        />
        <StatCard
          title="Wallet Float"
          value={formatNaira(stats?.wallets.totalAvailableBalance ?? 0)}
          subtitle={`Total credited ${formatNaira(stats?.wallets.totalCredited ?? 0)}`}
          icon={<Wallet className="w-5 h-5 text-[#F59E0B]" />}
          iconBg="#FEF3C7"
        />
      </div>

      {/* ── Two-column body ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent gift-card submissions */}
        <section className="bg-white border border-border rounded-2xl overflow-hidden">
          <header className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-[#272936]" style={{ fontSize: 15, fontWeight: 700 }}>
                Recent Gift Card Submissions
              </h2>
              <p className="text-[#6B7280]" style={{ fontSize: 12 }}>
                Latest user submissions across all brands
              </p>
            </div>
            <button
              onClick={() => navigate("/giftcards")}
              className="text-[#0159C7] hover:underline flex items-center gap-1"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </header>

          {recentGiftCards.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="w-6 h-6 text-[#D1D5DB]" />}
              title="No gift card submissions yet"
              description="Submissions will appear here as soon as users start trading."
            />
          ) : (
            <ul className="divide-y divide-border">
              {recentGiftCards.map((txn) => (
                <li
                  key={txn.id}
                  onClick={() => navigate("/giftcards")}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-[#F5F7FB] cursor-pointer transition-colors"
                >
                  <BrandLogoCell name={txn.brandName} logoUrl={txn.brand?.logoUrl ?? null} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#272936] truncate" style={{ fontSize: 14, fontWeight: 600 }}>
                      {txn.brandName} · {txn.countryCode}
                    </p>
                    <p className="text-[#6B7280] truncate" style={{ fontSize: 12 }}>
                      {txn.user.fullName} · {formatRelative(txn.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[#272936]" style={{ fontSize: 14, fontWeight: 700 }}>
                      {formatNaira(txn.payout)}
                    </p>
                    <StatusBadge status={txn.status} className="mt-1" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pending withdrawals */}
        <section className="bg-white border border-border rounded-2xl overflow-hidden">
          <header className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-[#272936]" style={{ fontSize: 15, fontWeight: 700 }}>
                Pending Withdrawals
              </h2>
              <p className="text-[#6B7280]" style={{ fontSize: 12 }}>
                Require review or Paystack confirmation
              </p>
            </div>
            <button
              onClick={() => navigate("/withdrawals")}
              className="text-[#0159C7] hover:underline flex items-center gap-1"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </header>

          {pendingWithdrawals.length === 0 ? (
            <EmptyState
              icon={<Banknote className="w-6 h-6 text-[#D1D5DB]" />}
              title="No pending withdrawals"
              description="New withdrawal requests will show up here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {pendingWithdrawals.map((w) => (
                <li
                  key={w.id}
                  onClick={() => navigate("/withdrawals")}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-[#F5F7FB] cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-[#F59E0B]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#272936] truncate" style={{ fontSize: 14, fontWeight: 600 }}>
                      {w.user.fullName}
                    </p>
                    <p className="text-[#6B7280] truncate" style={{ fontSize: 12 }}>
                      {w.bankName} · {w.accountNumber}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[#272936]" style={{ fontSize: 14, fontWeight: 700 }}>
                      {formatNaira(w.amount)}
                    </p>
                    <StatusBadge status={w.status} className="mt-1" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Recent admin activity (audit log) ────────────────────────────── */}
      <section className="bg-white border border-border rounded-2xl overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[#272936]" style={{ fontSize: 15, fontWeight: 700 }}>
              Recent Admin Activity
            </h2>
            <p className="text-[#6B7280]" style={{ fontSize: 12 }}>
              Latest actions from the audit log
            </p>
          </div>
          <button
            onClick={() => navigate("/logs")}
            className="text-[#0159C7] hover:underline flex items-center gap-1"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </header>

        {recentLogs.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6 text-[#D1D5DB]" />}
            title="No activity yet"
            description="Admin actions will be recorded here as they happen."
          />
        ) : (
          <ul className="divide-y divide-border">
            {recentLogs.map((log) => (
              <li key={log.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F5F7FB] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-[#6B7280]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#272936] truncate" style={{ fontSize: 14, fontWeight: 600 }}>
                    {log.action.replace(/_/g, " ")}
                  </p>
                  <p className="text-[#6B7280] truncate" style={{ fontSize: 12 }}>
                    {log.admin.fullName} · {log.entityType} · {formatRelative(log.createdAt)}
                  </p>
                </div>
                <span className="text-[#9CA3AF] shrink-0" style={{ fontSize: 11, fontFamily: "monospace" }}>
                  {log.entityId.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
