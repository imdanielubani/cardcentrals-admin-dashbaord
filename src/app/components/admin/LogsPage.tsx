import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, Filter, X, Download, ChevronLeft, ChevronRight,
  ArrowUpDown, Eye, Copy, MoreVertical,
  CheckCircle, XCircle, Edit2, UserX, Plus, Flag,
  CreditCard, Banknote, Settings, Shield, Clock, RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { api } from "../../../lib/api";
import type { AuditLog, PaginatedResponse } from "../../../types";

type ActionCategory = "Giftcard" | "Withdrawal" | "User" | "Rate" | "System" | "Security";

interface LogEntry {
  id: number;
  admin: string;
  adminRole: string;
  action: string;
  category: ActionCategory;
  target: string;
  details: string;
  ip: string;
  date: string;
  time: string;
}

const actionColors: Record<string, string> = {
  "Approved Giftcard": "text-[#22C55E]",
  "Rejected Giftcard": "text-[#EF4444]",
  "Approved Withdrawal": "text-[#22C55E]",
  "Rejected Withdrawal": "text-[#EF4444]",
  "Updated Rate": "text-[#0159C7]",
  "Suspended User": "text-[#EF4444]",
  "Added Brand": "text-[#0159C7]",
  "Flagged Giftcard": "text-[#F59E0B]",
  "Auto-Flagged": "text-[#F59E0B]",
  "Deleted Brand": "text-[#EF4444]",
  "Activated User": "text-[#22C55E]",
  "Updated Settings": "text-[#0159C7]",
  "Rate Auto-Update": "text-[#0159C7]",
  "Blocked User": "text-[#EF4444]",
  "Reset Password": "text-[#F59E0B]",
  "Bulk Approved": "text-[#22C55E]",
  "Exported Data": "text-[#6B7280]",
};

const categoryIcons: Record<ActionCategory, typeof CreditCard> = {
  Giftcard: CreditCard,
  Withdrawal: Banknote,
  User: UserX,
  Rate: Edit2,
  System: Settings,
  Security: Shield,
};

const categoryColors: Record<ActionCategory, string> = {
  Giftcard: "#0159C7",
  Withdrawal: "#22C55E",
  User: "#F59E0B",
  Rate: "#8B5CF6",
  System: "#6B7280",
  Security: "#EF4444",
};

const allCategories: ("All" | ActionCategory)[] = ["All", "Giftcard", "Withdrawal", "User", "Rate", "System", "Security"];

type SortKey = "id" | "admin" | "action" | "date";
type SortDir = "asc" | "desc";

const ITEMS_PER_PAGE = 8;

function LogDetailDrawer({ log, onClose }: { log: LogEntry; onClose: () => void }) {
  const Icon = categoryIcons[log.category];
  const color = categoryColors[log.category];
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 250 }} className="relative w-full max-w-md bg-white h-full overflow-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-[#272936]" style={{ fontSize: 18, fontWeight: 700 }}>Log Detail</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F5F7FB] flex items-center justify-center"><X className="w-5 h-5 text-[#6B7280]" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
              <Icon className="w-6 h-6" style={{ color }} />
            </div>
            <div>
              <div className={actionColors[log.action] || "text-[#272936]"} style={{ fontSize: 16, fontWeight: 700 }}>{log.action}</div>
              <div className="text-[#6B7280]" style={{ fontSize: 13 }}>{log.category} Action</div>
            </div>
          </div>

          <div className="bg-[#F5F7FB] rounded-xl p-4">
            <p className="text-[#272936]" style={{ fontSize: 14, lineHeight: 1.6 }}>{log.details}</p>
          </div>

          <div className="space-y-3">
            {[
              { label: "Log ID", value: `#${log.id}` },
              { label: "Admin", value: log.admin },
              { label: "Role", value: log.adminRole },
              { label: "Target", value: log.target },
              { label: "IP Address", value: log.ip },
              { label: "Date", value: `${log.date} · ${log.time}` },
            ].map((r) => (
              <div key={r.label} className="flex justify-between py-2 border-b border-border last:border-0">
                <span className="text-[#6B7280]" style={{ fontSize: 13 }}>{r.label}</span>
                <span className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>{r.value}</span>
              </div>
            ))}
          </div>

          <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(log, null, 2)); toast.success("Log data copied to clipboard"); }} className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-xl text-[#6B7280] hover:bg-[#F5F7FB]" style={{ fontSize: 14, fontWeight: 500 }}><Copy className="w-4 h-4" /> Copy Raw Log</button>
        </div>
      </motion.div>
    </div>
  );
}

export function LogsPage() {
  const { hasPermission } = useAdminAuth();
  const canManageLogs = hasPermission("logs.export");

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"All" | ActionCategory>("All");
  const [adminFilter, setAdminFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [drawerLog, setDrawerLog] = useState<LogEntry | null>(null);
  const [actionMenu, setActionMenu] = useState<number | null>(null);

  const actionMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) setActionMenu(null); };
    if (actionMenu !== null) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [actionMenu]);

  // Fetch audit logs from backend
  useEffect(() => {
    let cancelled = false;
    // Backend caps limit at 100 (admin.dto.ts auditLogFilterDto). Anything
    // higher fails zod validation with a 400 and lands the user on the
    // "Failed to load activity logs" toast.
    api.get<PaginatedResponse<AuditLog>>("/admin/audit-logs?limit=100&page=1")
      .then((res) => {
        if (cancelled) return;
        const categoryMap: Record<string, ActionCategory> = {
          giftcard: "Giftcard", gift_card: "Giftcard",
          withdrawal: "Withdrawal",
          user: "User",
          rate: "Rate", brand: "Rate",
          setting: "System", system: "System",
          auth: "Security", login: "Security",
        };
        const mapped: LogEntry[] = res.data.map((log) => ({
          id: parseInt(log.id.replace(/\D/g, "").slice(-8), 10) || Math.random(),
          admin: log.admin.fullName,
          adminRole: log.admin.role,
          action: log.action,
          category: (categoryMap[log.entityType?.toLowerCase() ?? ""] ?? "System") as ActionCategory,
          target: log.entityId ?? "—",
          details: typeof log.after === "object" && log.after ? JSON.stringify(log.after).slice(0, 120) : log.action,
          ip: log.ipAddress ?? "—",
          date: new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          time: new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        }));
        setLogs(mapped);
      })
      .catch(() => toast.error("Failed to load activity logs"));
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = logs.filter((l) => {
      const q = search.toLowerCase();
      const matchSearch = !q || l.action.toLowerCase().includes(q) || l.admin.toLowerCase().includes(q) || l.target.toLowerCase().includes(q) || l.details.toLowerCase().includes(q) || l.ip.includes(q);
      const matchCategory = categoryFilter === "All" || l.category === categoryFilter;
      const matchAdmin = adminFilter === "All" || l.admin === adminFilter;
      return matchSearch && matchCategory && matchAdmin;
    });
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "id": cmp = a.id - b.id; break;
        case "admin": cmp = a.admin.localeCompare(b.admin); break;
        case "action": cmp = a.action.localeCompare(b.action); break;
        case "date": cmp = a.id - b.id; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
    // `logs` MUST be in this dep array — the fetch resolves async and updates
    // `logs` via setLogs. Without it the memo keeps returning its initial
    // empty result and the table stays blank until the user touches a filter.
  }, [logs, search, categoryFilter, adminFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, categoryFilter, adminFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const exportCSV = () => {
    const header = "ID,Admin,Role,Action,Category,Target,Details,IP,Date,Time\n";
    const rows = filtered.map((l) => `"${l.id}","${l.admin}","${l.adminRole}","${l.action}","${l.category}","${l.target}","${l.details}","${l.ip}","${l.date}","${l.time}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cardcentrals-activity-logs.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Activity logs exported to CSV");
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <ArrowUpDown className={`w-3.5 h-3.5 inline-block ml-1 ${sortKey === col ? "text-[#0159C7]" : "text-[#9CA3AF]"}`} />
  );

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[#272936]" style={{ fontSize: 24, fontWeight: 700 }}>Activity Logs</h1>
          <p className="text-[#6B7280]" style={{ fontSize: 14 }}>Track all admin activities and system events · {filtered.length} entries</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-[#6B7280] hover:bg-[#F5F7FB]" style={{ fontSize: 13, fontWeight: 500 }}><Download className="w-4 h-4" /> Export Logs</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {allCategories.filter((c) => c !== "All").map((cat) => {
          const count = logs.filter((l) => l.category === cat).length;
          const Icon = categoryIcons[cat];
          const color = categoryColors[cat];
          return (
            <button key={cat} onClick={() => setCategoryFilter(cat)} className={`bg-white rounded-xl p-4 border text-left transition-all ${categoryFilter === cat ? "border-[#0159C7] ring-2 ring-[#0159C7]/10" : "border-border hover:border-[#D1D5DB]"}`}>
              <Icon className="w-4 h-4 mb-1.5" style={{ color }} />
              <div className="text-[#272936]" style={{ fontSize: 18, fontWeight: 700 }}>{count}</div>
              <div className="text-[#6B7280]" style={{ fontSize: 11 }}>{cat}</div>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border">
        <div className="p-5 border-b border-border space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 bg-[#F5F7FB] rounded-xl px-4 py-2 flex-1">
              <Search className="w-4 h-4 text-[#6B7280]" />
              <input type="text" placeholder="Search by admin, action, target, IP..." className="bg-transparent border-none outline-none text-[#272936] w-full" value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontSize: 14 }} />
              {search && <button onClick={() => setSearch("")}><X className="w-4 h-4 text-[#9CA3AF] hover:text-[#272936]" /></button>}
            </div>
            <select value={adminFilter} onChange={(e) => setAdminFilter(e.target.value)} className="px-4 py-2 border border-border rounded-xl text-[#6B7280] bg-white" style={{ fontSize: 13 }}>
              <option value="All">All Admins</option>
              {Array.from(new Set(logs.map((l) => l.admin))).sort().map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {allCategories.map((c) => {
              const count = c === "All" ? logs.length : logs.filter((l) => l.category === c).length;
              return (
                <button key={c} onClick={() => setCategoryFilter(c)} className={`px-4 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${categoryFilter === c ? "bg-[#0159C7] text-white" : "bg-[#F5F7FB] text-[#6B7280] hover:text-[#272936]"}`} style={{ fontSize: 13, fontWeight: 500 }}>
                  {c}
                  <span className={`px-1.5 py-0.5 rounded-full ${categoryFilter === c ? "bg-white/20" : "bg-[#E8EBF0]"}`} style={{ fontSize: 11, fontWeight: 600 }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F5F7FB]">
                {([
                  { key: "admin" as SortKey, label: "ADMIN" },
                  { key: "action" as SortKey, label: "ACTION" },
                  { key: null, label: "TARGET" },
                  { key: null, label: "CATEGORY" },
                  { key: null, label: "IP ADDRESS" },
                  { key: "date" as SortKey, label: "TIMESTAMP" },
                  ...(canManageLogs ? [{ key: null, label: "" }] : []),
                ] as const).map((col, i) => (
                  <th key={i} className={`text-left px-5 py-3 text-[#6B7280] ${col.key ? "cursor-pointer hover:text-[#272936] select-none" : ""}`} style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em" }} onClick={() => col.key && toggleSort(col.key)}>
                    {col.label}{col.key && <SortIcon col={col.key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={7} className="text-center py-16 text-[#6B7280]" style={{ fontSize: 14 }}>No logs match your criteria.</td></tr>
              )}
              {paginated.map((l) => {
                const Icon = categoryIcons[l.category];
                const color = categoryColors[l.category];
                return (
                  <tr key={l.id} className="border-t border-border hover:bg-[#F5F7FB]/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                          <span style={{ color, fontSize: 11, fontWeight: 600 }}>{l.admin[0]}</span>
                        </div>
                        <div>
                          <span className="text-[#272936]" style={{ fontSize: 13, fontWeight: 500 }}>{l.admin}</span>
                          <div className="text-[#9CA3AF]" style={{ fontSize: 11 }}>{l.adminRole}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={actionColors[l.action] || "text-[#272936]"} style={{ fontSize: 13, fontWeight: 500 }}>{l.action}</span>
                    </td>
                    <td className="px-5 py-4 text-[#6B7280] max-w-[200px] truncate" style={{ fontSize: 13 }}>{l.target}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5F7FB]" style={{ fontSize: 11, fontWeight: 500, color }}>
                        <Icon className="w-3 h-3" /> {l.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#6B7280]" style={{ fontSize: 13 }}>{l.ip}</td>
                    <td className="px-5 py-4">
                      <div className="text-[#6B7280]" style={{ fontSize: 13 }}>{l.date}</div>
                      <div className="text-[#9CA3AF]" style={{ fontSize: 11 }}>{l.time}</div>
                    </td>
                    {canManageLogs && (
                      <td className="px-5 py-4">
                        <div className="relative" ref={actionMenu === l.id ? actionMenuRef : undefined}>
                          <button onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === l.id ? null : l.id); }} className="p-1.5 hover:bg-[#F5F7FB] rounded-lg"><MoreVertical className="w-4 h-4 text-[#6B7280]" /></button>
                          <AnimatePresence>
                            {actionMenu === l.id && (
                              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-border py-1.5 w-44 z-20">
                                <button onClick={() => { setDrawerLog(l); setActionMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#272936] hover:bg-[#F5F7FB]" style={{ fontSize: 13 }}><Eye className="w-4 h-4 text-[#6B7280]" /> View Detail</button>
                                <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(l, null, 2)); toast.success("Log copied"); setActionMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#272936] hover:bg-[#F5F7FB]" style={{ fontSize: 13 }}><Copy className="w-4 h-4 text-[#6B7280]" /> Copy Log</button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[#6B7280]" style={{ fontSize: 13 }}>Showing {filtered.length > 0 ? (safePage - 1) * ITEMS_PER_PAGE + 1 : 0}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}</div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(safePage - 1)} disabled={safePage === 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F5F7FB] disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${p === safePage ? "bg-[#0159C7] text-white" : "text-[#6B7280] hover:bg-[#F5F7FB]"}`} style={{ fontSize: 13, fontWeight: p === safePage ? 600 : 400 }}>{p}</button>
            ))}
            <button onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F5F7FB] disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {drawerLog && <LogDetailDrawer key="drawer" log={drawerLog} onClose={() => setDrawerLog(null)} />}
      </AnimatePresence>
    </div>
  );
}