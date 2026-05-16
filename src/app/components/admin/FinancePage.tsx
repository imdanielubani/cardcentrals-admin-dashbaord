import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Search,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Copy,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast, Toaster } from "sonner";

import { dashboardService, financeService } from "../../../services";
import type { AdminStats, WalletTransaction } from "../../../types";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  PageLoader,
  StatCard,
} from "../shared";
import { useAdminAuth } from "../../context/AdminAuthContext";

const ITEMS_PER_PAGE = 20;

const formatNaira = (value: number): string =>
  `₦${(value ?? 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ── Transaction Drawer ────────────────────────────────────────────────────────

function EntryDrawer({
  entry,
  onClose,
}: {
  entry: WalletTransaction;
  onClose: () => void;
}) {
  const isCredit = entry.type === "credit";
  const userName = entry.wallet?.user?.fullName ?? "—";
  const userEmail = entry.wallet?.user?.email ?? "—";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 250 }}
        className="relative w-full max-w-md bg-white h-full overflow-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-[#272936]" style={{ fontSize: 18, fontWeight: 700 }}>
            Transaction Detail
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#F5F7FB] flex items-center justify-center"
          >
            <X className="w-5 h-5 text-[#6B7280]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className={`rounded-2xl p-6 text-center ${isCredit ? "bg-[#22C55E]/10" : "bg-[#EF4444]/10"}`}>
            <div
              className={isCredit ? "text-[#22C55E]" : "text-[#EF4444]"}
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              {isCredit ? "INFLOW" : "OUTFLOW"}
            </div>
            <div
              className={`mt-1 ${isCredit ? "text-[#22C55E]" : "text-[#EF4444]"}`}
              style={{ fontSize: 32, fontWeight: 700 }}
            >
              {isCredit ? "+" : "-"}
              {formatNaira(entry.amount)}
            </div>
          </div>

          <div className="space-y-3">
            {(
              [
                { label: "Reference", value: entry.reference },
                { label: "Description", value: entry.description },
                { label: "User", value: `${userName} (${userEmail})` },
                { label: "Date", value: formatDate(entry.createdAt) },
              ] as const
            ).map((r) => (
              <div
                key={r.label}
                className="flex justify-between gap-4 py-2 border-b border-border last:border-0"
              >
                <span className="text-[#6B7280] shrink-0" style={{ fontSize: 13 }}>
                  {r.label}
                </span>
                <span
                  className="text-[#272936] text-right break-words"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  {r.value}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(entry.reference);
              toast.success("Reference copied");
            }}
            className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-xl text-[#6B7280] hover:bg-[#F5F7FB]"
            style={{ fontSize: 14, fontWeight: 500 }}
          >
            <Copy className="w-4 h-4" /> Copy Reference
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function FinancePage() {
  const { hasPermission } = useAdminAuth();
  const canExport = hasPermission("finance.export");

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [entries, setEntries] = useState<WalletTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "credit" | "debit">("All");
  const [drawerEntry, setDrawerEntry] = useState<WalletTransaction | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [statsRes, ledgerRes] = await Promise.all([
        dashboardService.getStats(),
        financeService.listLedger(page, ITEMS_PER_PAGE),
      ]);
      setStats(statsRes);
      setEntries(ledgerRes.data);
      setTotalPages(Math.max(1, ledgerRes.meta.pages));
      setTotal(ledgerRes.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load finance data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setIsRefreshing(true);
    await load();
    toast.success("Finance data refreshed");
  };

  // Client-side filter on the current page — for global filter we'd need server params
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (typeFilter !== "All" && e.type !== typeFilter) return false;
      if (!q) return true;
      const hay = `${e.description} ${e.reference} ${e.wallet?.user?.fullName ?? ""} ${e.wallet?.user?.email ?? ""}`
        .toLowerCase();
      return hay.includes(q);
    });
  }, [entries, search, typeFilter]);

  const exportCSV = () => {
    const header = "Date,Type,Amount,Description,Reference,User,Email\n";
    const rows = filtered
      .map((e) =>
        [
          formatDate(e.createdAt),
          e.type,
          e.amount,
          `"${(e.description ?? "").replace(/"/g, '""')}"`,
          e.reference,
          `"${e.wallet?.user?.fullName ?? ""}"`,
          e.wallet?.user?.email ?? "",
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cardcentrals-ledger.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Ledger exported");
  };

  if (isLoading) return <PageLoader />;
  if (error && entries.length === 0) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="p-6 space-y-6">
      <Toaster richColors position="top-right" />

      <PageHeader
        title="Finance"
        subtitle="Wallet ledger, inflows, and outflows across all users"
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

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Wallet Balance"
          value={formatNaira(stats?.wallets.totalAvailableBalance ?? 0)}
          subtitle="Sum of all user wallets"
          icon={<Wallet className="w-5 h-5 text-[#0159C7]" />}
          iconBg="#EFF6FF"
        />
        <StatCard
          title="Total Credited"
          value={formatNaira(stats?.wallets.totalCredited ?? 0)}
          subtitle="All-time inflows"
          icon={<TrendingUp className="w-5 h-5 text-[#22C55E]" />}
          iconBg="#F0FDF4"
        />
        <StatCard
          title="Total Withdrawn"
          value={formatNaira(stats?.wallets.totalWithdrawn ?? 0)}
          subtitle={`${stats?.withdrawals.paid ?? 0} completed payouts`}
          icon={<TrendingDown className="w-5 h-5 text-[#EF4444]" />}
          iconBg="#FEF2F2"
        />
        <StatCard
          title="Gift Card Volume"
          value={formatNaira(stats?.giftCards.completedVolume ?? 0)}
          subtitle={`${stats?.giftCards.completed ?? 0} completed submissions`}
          icon={<ArrowUpRight className="w-5 h-5 text-[#8B5CF6]" />}
          iconBg="#F5F3FF"
        />
      </div>

      {/* ── Ledger ──────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-border">
        <div className="p-5 border-b border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-[#272936]" style={{ fontSize: 16, fontWeight: 600 }}>
                Wallet Ledger
              </h3>
              <p className="text-[#6B7280]" style={{ fontSize: 12 }}>
                Showing page {page} of {totalPages} · {total.toLocaleString()} entries total
              </p>
            </div>
            {canExport && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-[#6B7280] hover:bg-[#F5F7FB]"
                style={{ fontSize: 13, fontWeight: 500 }}
              >
                <Download className="w-4 h-4" /> Export this page
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 bg-[#F5F7FB] rounded-xl px-4 py-2 flex-1">
              <Search className="w-4 h-4 text-[#6B7280]" />
              <input
                type="text"
                placeholder="Search by user, description, reference..."
                className="bg-transparent border-none outline-none text-[#272936] w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: 14 }}
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X className="w-4 h-4 text-[#9CA3AF] hover:text-[#272936]" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {(
                [
                  ["All", "All"],
                  ["credit", "Credits"],
                  ["debit", "Debits"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setTypeFilter(val)}
                  className={`px-4 py-1.5 rounded-lg transition-colors ${
                    typeFilter === val ? "bg-[#0159C7] text-white" : "bg-[#F5F7FB] text-[#6B7280]"
                  }`}
                  style={{ fontSize: 13, fontWeight: 500 }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No ledger entries"
            description="Entries will appear here as users trade or withdraw."
          />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((entry) => {
              const isCredit = entry.type === "credit";
              return (
                <button
                  key={entry.id}
                  onClick={() => setDrawerEntry(entry)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#F5F7FB]/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        isCredit ? "bg-[#22C55E]/10" : "bg-[#EF4444]/10"
                      }`}
                    >
                      {isCredit ? (
                        <ArrowUpRight className="w-4 h-4 text-[#22C55E]" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-[#EF4444]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[#272936] truncate" style={{ fontSize: 14, fontWeight: 500 }}>
                        {entry.description}
                      </div>
                      <div className="text-[#6B7280] truncate" style={{ fontSize: 12 }}>
                        {entry.wallet?.user?.fullName ?? "—"} · {entry.reference}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div
                      className={isCredit ? "text-[#22C55E]" : "text-[#EF4444]"}
                      style={{ fontSize: 14, fontWeight: 600 }}
                    >
                      {isCredit ? "+" : "-"}
                      {formatNaira(entry.amount)}
                    </div>
                    <div className="text-[#6B7280]" style={{ fontSize: 12 }}>
                      {formatDate(entry.createdAt)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <div className="text-[#6B7280]" style={{ fontSize: 13 }}>
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F5F7FB] disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F5F7FB] disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {drawerEntry && (
          <EntryDrawer key="drawer" entry={drawerEntry} onClose={() => setDrawerEntry(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
