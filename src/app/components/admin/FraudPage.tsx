import { useState, useEffect, useRef, useMemo } from "react";
import {
  AlertTriangle, Shield, Eye, Ban, Search, X, Check,
  MoreVertical, ChevronLeft, ChevronRight, Download,
  Flag, CheckCircle, XCircle, Clock, RefreshCw,
  UserX, ShieldCheck, ShieldAlert, MessageSquare, Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { api } from "../../../lib/api";
import type { GiftCardTransaction as BackendGiftCard, PaginatedResponse } from "../../../types";

type Severity = "Critical" | "High" | "Medium" | "Low";
type AlertStatus = "Active" | "Investigating" | "Resolved" | "Dismissed";

interface FraudAlert {
  id: number;
  txnId: string;          // backend GiftCardTransaction id (used for status updates)
  userId: string;         // backend User id (used for suspending the account)
  type: string;
  user: string;
  userEmail: string;
  details: string;
  severity: Severity;
  status: AlertStatus;
  time: string;
  date: string;
  relatedIds: string[];
  ipAddress: string;
  notes: string[];
}

const severityColors: Record<Severity, string> = {
  Critical: "bg-[#EF4444] text-white",
  High: "bg-[#EF4444]/10 text-[#EF4444]",
  Medium: "bg-[#F59E0B]/10 text-[#F59E0B]",
  Low: "bg-[#6B7280]/10 text-[#6B7280]",
};

const statusColors: Record<AlertStatus, string> = {
  Active: "bg-[#EF4444]/10 text-[#EF4444]",
  Investigating: "bg-[#F59E0B]/10 text-[#F59E0B]",
  Resolved: "bg-[#22C55E]/10 text-[#22C55E]",
  Dismissed: "bg-[#6B7280]/10 text-[#6B7280]",
};

const ITEMS_PER_PAGE = 5;

function AlertDrawer({
  alert: a,
  onClose,
  onInvestigate,
  onResolve,
  onDismiss,
  onBlockUser,
  onAddNote,
  canInvestigate,
  canResolve,
  canBlock,
}: {
  alert: FraudAlert;
  onClose: () => void;
  onInvestigate: () => void;
  onResolve: () => void;
  onDismiss: () => void;
  onBlockUser: () => void;
  onAddNote: (note: string) => void;
  canInvestigate: boolean;
  canResolve: boolean;
  canBlock: boolean;
}) {
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 250 }} className="relative w-full max-w-lg bg-white h-full overflow-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-[#272936]" style={{ fontSize: 18, fontWeight: 700 }}>Alert Detail</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F5F7FB] flex items-center justify-center"><X className="w-5 h-5 text-[#6B7280]" /></button>
        </div>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full ${severityColors[a.severity]}`} style={{ fontSize: 12, fontWeight: 600 }}>{a.severity}</span>
              <span className={`px-2.5 py-1 rounded-full ${statusColors[a.status]}`} style={{ fontSize: 12, fontWeight: 600 }}>{a.status}</span>
            </div>
            <span className="text-[#6B7280]" style={{ fontSize: 12 }}>#{a.id}</span>
          </div>

          {/* Alert banner */}
          <div className={`rounded-2xl p-5 ${a.severity === "Critical" ? "bg-[#EF4444]/10 border border-[#EF4444]/20" : "bg-[#F59E0B]/10 border border-[#F59E0B]/20"}`}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className={`w-5 h-5 ${a.severity === "Critical" ? "text-[#EF4444]" : "text-[#F59E0B]"}`} />
              <span className="text-[#272936]" style={{ fontSize: 16, fontWeight: 700 }}>{a.type}</span>
            </div>
            <p className="text-[#6B7280]" style={{ fontSize: 13, lineHeight: 1.6 }}>{a.details}</p>
          </div>

          {/* Details */}
          <div className="space-y-3">
            {[
              { label: "User", value: a.user },
              { label: "Email", value: a.userEmail },
              { label: "IP Address", value: a.ipAddress },
              { label: "Date", value: `${a.date} · ${a.time}` },
            ].map((r) => (
              <div key={r.label} className="flex justify-between py-2 border-b border-border last:border-0">
                <span className="text-[#6B7280]" style={{ fontSize: 13 }}>{r.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>{r.value}</span>
                  {r.label === "IP Address" && (
                    <button onClick={() => { navigator.clipboard.writeText(r.value); toast.success("IP copied!"); }}><Copy className="w-3.5 h-3.5 text-[#9CA3AF] hover:text-[#0159C7]" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Related IDs */}
          {a.relatedIds.length > 0 && (
            <div>
              <h4 className="text-[#6B7280] mb-2" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>RELATED SUBMISSIONS</h4>
              <div className="flex flex-wrap gap-2">
                {a.relatedIds.map((id) => (
                  <span key={id} className="px-3 py-1.5 bg-[#F5F7FB] rounded-lg text-[#0159C7]" style={{ fontSize: 13, fontWeight: 600 }}>{id}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <h4 className="text-[#6B7280] mb-2" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>INVESTIGATION NOTES</h4>
            {a.notes.length === 0 && <p className="text-[#9CA3AF]" style={{ fontSize: 13 }}>No notes yet.</p>}
            {a.notes.map((n, i) => (
              <div key={i} className="bg-[#F5F7FB] rounded-lg px-4 py-2.5 mb-2">
                <p className="text-[#272936]" style={{ fontSize: 13 }}>{n}</p>
                <p className="text-[#9CA3AF] mt-1" style={{ fontSize: 11 }}>Admin · Just now</p>
              </div>
            ))}
            {a.status !== "Resolved" && a.status !== "Dismissed" && canInvestigate && (
              <div className="flex gap-2 mt-3">
                <input className="flex-1 bg-[#F5F7FB] border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0159C7]" placeholder="Add a note..." value={note} onChange={(e) => setNote(e.target.value)} style={{ fontSize: 14 }} />
                <button onClick={() => { if (!note.trim()) return; onAddNote(note); setNote(""); }} className="px-4 py-2.5 bg-[#0159C7] text-white rounded-xl hover:bg-[#014BA8]" style={{ fontSize: 13, fontWeight: 600 }}>Add</button>
              </div>
            )}
          </div>

          {/* Actions */}
          {(a.status === "Active" || a.status === "Investigating") && (canInvestigate || canResolve || canBlock) && (
            <div className="space-y-2 pt-2">
              {a.status === "Active" && canInvestigate && (
                <button onClick={onInvestigate} className="w-full flex items-center justify-center gap-2 py-3 bg-[#F59E0B] text-white rounded-xl hover:bg-[#D97706] transition-colors" style={{ fontSize: 14, fontWeight: 600 }}><Eye className="w-4 h-4" /> Mark as Investigating</button>
              )}
              {canResolve && (
                <>
                  <button onClick={onResolve} className="w-full flex items-center justify-center gap-2 py-3 bg-[#22C55E] text-white rounded-xl hover:bg-[#16A34A] transition-colors" style={{ fontSize: 14, fontWeight: 600 }}><CheckCircle className="w-4 h-4" /> Resolve Alert</button>
                  <button onClick={onDismiss} className="w-full flex items-center justify-center gap-2 py-3 border border-[#6B7280] text-[#6B7280] rounded-xl hover:bg-[#F5F7FB] transition-colors" style={{ fontSize: 14, fontWeight: 600 }}><XCircle className="w-4 h-4" /> Dismiss as False Positive</button>
                </>
              )}
              {canBlock && (
                <button onClick={onBlockUser} className="w-full flex items-center justify-center gap-2 py-3 bg-[#EF4444] text-white rounded-xl hover:bg-[#DC2626] transition-colors" style={{ fontSize: 14, fontWeight: 600 }}><Ban className="w-4 h-4" /> Block User</button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel, confirmColor, onClose, onConfirm }: {
  title: string; message: string; confirmLabel: string; confirmColor: string; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h3 className="text-[#272936] mb-2" style={{ fontSize: 18, fontWeight: 700 }}>{title}</h3>
        <p className="text-[#6B7280] mb-6" style={{ fontSize: 14, lineHeight: 1.6 }}>{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-[#6B7280] hover:bg-[#F5F7FB]" style={{ fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-white rounded-xl hover:opacity-90" style={{ fontSize: 14, fontWeight: 600, backgroundColor: confirmColor }}>{confirmLabel}</button>
        </div>
      </motion.div>
    </div>
  );
}

export function FraudPage() {
  const { hasPermission } = useAdminAuth();
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"All" | Severity>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | AlertStatus>("All");
  const [page, setPage] = useState(1);
  const [drawerAlert, setDrawerAlert] = useState<FraudAlert | null>(null);
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; confirmLabel: string; confirmColor: string; onConfirm: () => void } | null>(null);

  const actionMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) setActionMenu(null); };
    if (actionMenu !== null) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [actionMenu]);

  // Fetch flagged transactions from backend
  useEffect(() => {
    let cancelled = false;
    api.get<PaginatedResponse<BackendGiftCard>>("/admin/gift-cards?status=flagged&limit=100&page=1")
      .then((res) => {
        if (cancelled) return;
        const mapped: FraudAlert[] = res.data.map((g, idx) => ({
          id: idx + 1,
          txnId: g.id,
          userId: g.user.id,
          type: g.flagReason ?? "Flagged Submission",
          user: g.user.fullName,
          userEmail: g.user.email,
          details: `${g.brandName} $${g.amount} (${g.countryCode}) — ${g.eCode ? "E-Code" : "Physical"}`,
          severity: "High" as Severity,
          status: "Active" as AlertStatus,
          time: new Date(g.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          date: new Date(g.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          relatedIds: [g.id],
          ipAddress: "—",
          notes: [],
        }));
        setAlerts(mapped);
      })
      .catch(() => toast.error("Failed to load fraud alerts"));
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      const q = search.toLowerCase();
      const matchSearch = !q || a.type.toLowerCase().includes(q) || a.user.toLowerCase().includes(q) || a.details.toLowerCase().includes(q) || a.ipAddress.includes(q);
      const matchSev = severityFilter === "All" || a.severity === severityFilter;
      const matchStatus = statusFilter === "All" || a.status === statusFilter;
      return matchSearch && matchSev && matchStatus;
    });
  }, [alerts, search, severityFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, severityFilter, statusFilter]);

  const updateAlert = (id: number, updates: Partial<FraudAlert>) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } : a));
    setDrawerAlert((prev) => prev?.id === id ? { ...prev, ...updates } as FraudAlert : prev);
  };

  // "Investigating" is purely UI-side bookkeeping — no backend status maps to it.
  const investigate = (id: number) => {
    updateAlert(id, { status: "Investigating" });
    toast.info("Alert marked as investigating");
  };

  // "Resolve" → approve the underlying gift-card transaction (status='completed')
  // which credits the user's wallet and notifies them via the existing pipeline.
  const resolve = async (id: number) => {
    const a = alerts.find((x) => x.id === id);
    if (!a) return;
    try {
      await api.patch(`/admin/gift-cards/${a.txnId}/status`, {
        status: "completed",
        adminNote: "Resolved from fraud queue — approved after review.",
      });
      updateAlert(id, { status: "Resolved" });
      toast.success("Alert resolved — transaction approved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve alert");
    }
  };

  // "Dismiss" → clear the flag and return the txn to the normal pending queue.
  // The backend records this as `txn_unflagged` in the audit log automatically.
  const dismiss = async (id: number) => {
    const a = alerts.find((x) => x.id === id);
    if (!a) return;
    try {
      await api.patch(`/admin/gift-cards/${a.txnId}/status`, {
        status: "pending",
        adminNote: "Dismissed as false positive — flag cleared.",
      });
      updateAlert(id, { status: "Dismissed" });
      toast.success("Alert dismissed — flag cleared.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to dismiss alert");
    }
  };

  // "Block User" → suspend the user's account via the real users endpoint.
  const blockUser = async (id: number) => {
    const a = alerts.find((x) => x.id === id);
    if (!a) return;
    try {
      await api.patch(`/admin/users/${a.userId}/status`, {
        status: "suspended",
        reason: `Suspended from fraud queue — alert ${a.type}`,
      });
      updateAlert(id, {
        status: "Resolved",
        notes: [...a.notes, `User ${a.user} suspended by admin`],
      });
      toast.success(`${a.user} has been suspended.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to block user");
    } finally {
      setConfirmModal(null);
    }
  };
  const addNote = (id: number, note: string) => {
    const a = alerts.find((x) => x.id === id);
    updateAlert(id, { notes: [...(a?.notes || []), note] });
    toast.success("Note added");
  };

  const activeCount = alerts.filter((a) => a.status === "Active").length;
  const criticalCount = alerts.filter((a) => a.severity === "Critical" && a.status !== "Resolved" && a.status !== "Dismissed").length;
  const investigatingCount = alerts.filter((a) => a.status === "Investigating").length;
  const resolvedCount = alerts.filter((a) => a.status === "Resolved").length;

  const exportCSV = () => {
    const header = "ID,Type,User,Severity,Status,Details,IP,Date\n";
    const rows = filtered.map((a) => `"${a.id}","${a.type}","${a.user}","${a.severity}","${a.status}","${a.details}","${a.ipAddress}","${a.date} ${a.time}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url; el.download = "cardcentrals-fraud-alerts.csv"; el.click();
    URL.revokeObjectURL(url);
    toast.success("Fraud alerts exported");
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[#272936]" style={{ fontSize: 24, fontWeight: 700 }}>Fraud Monitoring</h1>
          <p className="text-[#6B7280]" style={{ fontSize: 14 }}>Detect and prevent fraudulent activities · {filtered.length} alerts</p>
        </div>
        {hasPermission("fraud.investigate") && (
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-[#6B7280] hover:bg-[#F5F7FB]" style={{ fontSize: 13, fontWeight: 500 }}><Download className="w-4 h-4" /> Export</button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Alerts", value: activeCount, color: "#EF4444", icon: ShieldAlert, flt: "Active" as AlertStatus },
          { label: "Critical", value: criticalCount, color: "#EF4444", icon: AlertTriangle, flt: null },
          { label: "Investigating", value: investigatingCount, color: "#F59E0B", icon: Eye, flt: "Investigating" as AlertStatus },
          { label: "Resolved", value: resolvedCount, color: "#22C55E", icon: ShieldCheck, flt: "Resolved" as AlertStatus },
        ].map((s) => (
          <button key={s.label} onClick={() => s.flt && setStatusFilter(s.flt)} className={`bg-white rounded-2xl p-5 border text-left transition-all ${s.flt && statusFilter === s.flt ? "border-[#0159C7] ring-2 ring-[#0159C7]/10" : "border-border hover:border-[#D1D5DB]"}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
            </div>
            <div className="text-[#272936]" style={{ fontSize: 26, fontWeight: 700 }}>{s.value}</div>
            <div className="text-[#6B7280]" style={{ fontSize: 13 }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border">
        <div className="p-5 border-b border-border space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 bg-[#F5F7FB] rounded-xl px-4 py-2 flex-1">
              <Search className="w-4 h-4 text-[#6B7280]" />
              <input type="text" placeholder="Search alerts by type, user, IP..." className="bg-transparent border-none outline-none text-[#272936] w-full" value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontSize: 14 }} />
              {search && <button onClick={() => setSearch("")}><X className="w-4 h-4 text-[#9CA3AF] hover:text-[#272936]" /></button>}
            </div>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as any)} className="px-4 py-2 border border-border rounded-xl text-[#6B7280] bg-white" style={{ fontSize: 13 }}>
              <option value="All">All Severity</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {(["All", "Active", "Investigating", "Resolved", "Dismissed"] as const).map((s) => {
              const count = s === "All" ? alerts.length : alerts.filter((a) => a.status === s).length;
              return (
                <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${statusFilter === s ? "bg-[#0159C7] text-white" : "bg-[#F5F7FB] text-[#6B7280] hover:text-[#272936]"}`} style={{ fontSize: 13, fontWeight: 500 }}>
                  {s}
                  <span className={`px-1.5 py-0.5 rounded-full ${statusFilter === s ? "bg-white/20" : "bg-[#E8EBF0]"}`} style={{ fontSize: 11, fontWeight: 600 }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="divide-y divide-border">
          {paginated.length === 0 && <div className="text-center py-16 text-[#6B7280]" style={{ fontSize: 14 }}>No alerts match your criteria.</div>}
          {paginated.map((alert) => (
            <div key={alert.id} className="p-5 hover:bg-[#F5F7FB]/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${alert.severity === "Critical" ? "bg-[#EF4444]/20" : alert.severity === "High" ? "bg-[#EF4444]/10" : alert.severity === "Medium" ? "bg-[#F59E0B]/10" : "bg-[#6B7280]/10"}`}>
                    <Shield className={`w-5 h-5 ${alert.severity === "Critical" || alert.severity === "High" ? "text-[#EF4444]" : alert.severity === "Medium" ? "text-[#F59E0B]" : "text-[#6B7280]"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[#272936]" style={{ fontSize: 14, fontWeight: 600 }}>{alert.type}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full ${severityColors[alert.severity]}`} style={{ fontSize: 11, fontWeight: 600 }}>{alert.severity}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full ${statusColors[alert.status]}`} style={{ fontSize: 11, fontWeight: 600 }}>{alert.status}</span>
                    </div>
                    <p className="text-[#6B7280] mb-2" style={{ fontSize: 13, lineHeight: 1.5 }}>{alert.details}</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-[#6B7280]" style={{ fontSize: 12 }}>User: <span style={{ fontWeight: 500 }}>{alert.user}</span></span>
                      <span className="text-[#6B7280]" style={{ fontSize: 12 }}>IP: {alert.ipAddress}</span>
                      <span className="text-[#9CA3AF]" style={{ fontSize: 12 }}>{alert.date} · {alert.time}</span>
                    </div>
                    {alert.notes.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-[#0159C7]" style={{ fontSize: 12, fontWeight: 500 }}>
                        <MessageSquare className="w-3 h-3" /> {alert.notes.length} note(s)
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative shrink-0" ref={actionMenu === alert.id ? actionMenuRef : undefined}>
                  <button onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === alert.id ? null : alert.id); }} className="p-1.5 hover:bg-[#F5F7FB] rounded-lg"><MoreVertical className="w-4 h-4 text-[#6B7280]" /></button>
                  <AnimatePresence>
                    {actionMenu === alert.id && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-border py-1.5 w-52 z-20">
                        <button onClick={() => { setDrawerAlert(alert); setActionMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#272936] hover:bg-[#F5F7FB]" style={{ fontSize: 13 }}><Eye className="w-4 h-4 text-[#6B7280]" /> View Details</button>
                        {alert.status === "Active" && hasPermission("fraud.investigate") && (
                          <button onClick={() => { investigate(alert.id); setActionMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#F59E0B] hover:bg-[#F59E0B]/5" style={{ fontSize: 13 }}><Clock className="w-4 h-4" /> Investigate</button>
                        )}
                        {(alert.status === "Active" || alert.status === "Investigating") && (
                          <>
                            {hasPermission("fraud.resolve") && (
                              <>
                                <button onClick={() => { resolve(alert.id); setActionMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#22C55E] hover:bg-[#22C55E]/5" style={{ fontSize: 13 }}><CheckCircle className="w-4 h-4" /> Resolve</button>
                                <button onClick={() => { dismiss(alert.id); setActionMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#6B7280] hover:bg-[#F5F7FB]" style={{ fontSize: 13 }}><XCircle className="w-4 h-4" /> Dismiss</button>
                              </>
                            )}
                            {hasPermission("fraud.block") && (
                              <>
                                <div className="mx-3 my-1 border-t border-border" />
                                <button onClick={() => { setConfirmModal({ title: "Block User", message: `Block ${alert.user}? They will be unable to log in or make submissions.`, confirmLabel: "Block User", confirmColor: "#EF4444", onConfirm: () => blockUser(alert.id) }); setActionMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#EF4444] hover:bg-[#EF4444]/5" style={{ fontSize: 13 }}><Ban className="w-4 h-4" /> Block User</button>
                              </>
                            )}
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ))}
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
        {drawerAlert && (
          <AlertDrawer
            key="drawer"
            alert={drawerAlert}
            onClose={() => setDrawerAlert(null)}
            onInvestigate={() => investigate(drawerAlert.id)}
            onResolve={() => resolve(drawerAlert.id)}
            onDismiss={() => dismiss(drawerAlert.id)}
            onBlockUser={() => setConfirmModal({ title: "Block User", message: `Block ${drawerAlert.user}? They will be unable to log in.`, confirmLabel: "Block User", confirmColor: "#EF4444", onConfirm: () => blockUser(drawerAlert.id) })}
            onAddNote={(note) => addNote(drawerAlert.id, note)}
            canInvestigate={hasPermission("fraud.investigate")}
            canResolve={hasPermission("fraud.resolve")}
            canBlock={hasPermission("fraud.block")}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {confirmModal && <ConfirmModal key="confirm" {...confirmModal} onClose={() => setConfirmModal(null)} />}
      </AnimatePresence>
    </div>
  );
}