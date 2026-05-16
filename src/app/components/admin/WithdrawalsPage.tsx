import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search, Filter, Check, X, Eye, Banknote, MoreVertical,
  ChevronLeft, ChevronRight, Download, ArrowUpDown, Clock,
  Copy, CheckCircle, XCircle, RefreshCw, Building2,
  CreditCard, AlertTriangle, Flag, Send, Wallet, Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { api } from "../../../lib/api";
import type { Withdrawal as BackendWithdrawal, PaginatedResponse } from "../../../types";

// ── Types ──
type Status = "Pending" | "Completed" | "Rejected" | "Processing";

interface ActivityItem {
  action: string;
  by: string;
  time: string;
  note?: string;
}

interface Withdrawal {
  id: string;
  user: string;
  userEmail: string;
  bank: string;
  accountName: string;
  accountNumber: string;
  amount: string;
  amountNum: number;
  fee: string;
  feeNum: number;
  netAmount: string;
  netAmountNum: number;
  status: Status;
  date: string;
  time: string;
  walletBalance: string;
  walletBalanceNum: number;
  rejectionReason?: string;
  adminNote?: string;
  reference?: string;
  activity: ActivityItem[];
}

const rejectionReasons = [
  "Insufficient KYC verification",
  "Exceeds daily withdrawal limit",
  "Suspicious activity detected",
  "Invalid bank details",
  "Account mismatch",
  "Pending review from compliance",
  "Other",
];

const allBanks = ["GTBank", "First Bank", "Access Bank", "UBA", "Zenith Bank", "Kuda", "Wema Bank", "Stanbic IBTC"];

const statusColors: Record<Status, string> = {
  Pending: "bg-[#F59E0B]/10 text-[#F59E0B]",
  Processing: "bg-[#0159C7]/10 text-[#0159C7]",
  Completed: "bg-[#22C55E]/10 text-[#22C55E]",
  Rejected: "bg-[#EF4444]/10 text-[#EF4444]",
};

type SortKey = "id" | "user" | "bank" | "amountNum" | "status" | "date";
type SortDir = "asc" | "desc";

// ── Subcomponents ──

function WithdrawalDrawer({
  withdrawal: w,
  onClose,
  onApprove,
  onReject,
}: {
  withdrawal: Withdrawal;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 250 }}
        className="relative w-full max-w-lg bg-white h-full overflow-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-[#272936]" style={{ fontSize: 18, fontWeight: 700 }}>Withdrawal Detail</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F5F7FB] flex items-center justify-center"><X className="w-5 h-5 text-[#6B7280]" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & ID */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[#6B7280]" style={{ fontSize: 13 }}>ID:</span>
              <span className="text-[#272936]" style={{ fontSize: 14, fontWeight: 700 }}>{w.id}</span>
              <button onClick={() => { navigator.clipboard.writeText(w.id); toast.success("ID copied!"); }}>
                <Copy className="w-3.5 h-3.5 text-[#9CA3AF] hover:text-[#0159C7]" />
              </button>
            </div>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${statusColors[w.status]}`} style={{ fontSize: 12, fontWeight: 600 }}>
              {w.status === "Pending" && <Clock className="w-3 h-3" />}
              {w.status === "Processing" && <RefreshCw className="w-3 h-3" />}
              {w.status === "Completed" && <CheckCircle className="w-3 h-3" />}
              {w.status === "Rejected" && <XCircle className="w-3 h-3" />}
              {w.status}
            </span>
          </div>

          {/* Amount card */}
          <div className="bg-gradient-to-br from-[#0159C7] to-[#126CF8] rounded-2xl p-6 text-center">
            <div className="text-white/60" style={{ fontSize: 13 }}>Withdrawal Amount</div>
            <div className="text-white mt-1" style={{ fontSize: 32, fontWeight: 700 }}>{w.amount}</div>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div>
                <div className="text-white/50" style={{ fontSize: 11 }}>Fee</div>
                <div className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>{w.fee}</div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <div className="text-white/50" style={{ fontSize: 11 }}>Net Payout</div>
                <div className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>{w.netAmount}</div>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div>
            <h4 className="text-[#6B7280] mb-2" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>REQUESTED BY</h4>
            <div className="bg-[#F5F7FB] rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0159C7] rounded-full flex items-center justify-center shrink-0">
                <span className="text-white" style={{ fontSize: 14, fontWeight: 700 }}>{w.user[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[#272936] truncate" style={{ fontSize: 14, fontWeight: 600 }}>{w.user}</div>
                <div className="text-[#6B7280]" style={{ fontSize: 12 }}>{w.userEmail}</div>
              </div>
              <div className="text-right">
                <div className="text-[#6B7280]" style={{ fontSize: 11 }}>Wallet</div>
                <div className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>{w.walletBalance}</div>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <h4 className="text-[#6B7280] mb-2" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>BANK DETAILS</h4>
            <div className="bg-[#F5F7FB] rounded-xl p-4 space-y-3">
              {[
                { label: "Bank", value: w.bank },
                { label: "Account Name", value: w.accountName },
                { label: "Account Number", value: w.accountNumber },
              ].map((r) => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-[#6B7280]" style={{ fontSize: 13 }}>{r.label}</span>
                  <span className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction details */}
          <div>
            <h4 className="text-[#6B7280] mb-2" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>TRANSACTION DETAILS</h4>
            <div className="bg-[#F5F7FB] rounded-xl p-4 space-y-3">
              {[
                { label: "Amount", value: w.amount },
                { label: "Fee", value: w.fee },
                { label: "Date", value: `${w.date} · ${w.time}` },
              ].map((r) => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-[#6B7280]" style={{ fontSize: 13 }}>{r.label}</span>
                  <span className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
              <div className="border-t border-[#E8EBF0] pt-3 flex justify-between">
                <span className="text-[#272936]" style={{ fontSize: 14, fontWeight: 600 }}>Net Payout</span>
                <span className="text-[#0159C7]" style={{ fontSize: 20, fontWeight: 700 }}>{w.netAmount}</span>
              </div>
            </div>
          </div>

          {/* Reference */}
          {w.reference && (
            <div>
              <h4 className="text-[#6B7280] mb-2" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>TRANSFER REFERENCE</h4>
              <div className="bg-[#F5F7FB] rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-[#272936] tracking-wider" style={{ fontSize: 14, fontWeight: 600 }}>{w.reference}</span>
                <button onClick={() => { navigator.clipboard.writeText(w.reference!); toast.success("Reference copied!"); }} className="text-[#0159C7]">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Rejection Reason */}
          {w.rejectionReason && (
            <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-[#EF4444]" />
                <span className="text-[#EF4444]" style={{ fontSize: 13, fontWeight: 600 }}>Rejection Reason</span>
              </div>
              <p className="text-[#6B7280]" style={{ fontSize: 13 }}>{w.rejectionReason}</p>
            </div>
          )}

          {/* Admin Note */}
          {w.adminNote && (
            <div className="bg-[#0159C7]/5 border border-[#0159C7]/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Banknote className="w-4 h-4 text-[#0159C7]" />
                <span className="text-[#0159C7]" style={{ fontSize: 13, fontWeight: 600 }}>Admin Note</span>
              </div>
              <p className="text-[#6B7280]" style={{ fontSize: 13 }}>{w.adminNote}</p>
            </div>
          )}

          {/* Activity timeline */}
          <div>
            <h4 className="text-[#6B7280] mb-3" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>ACTIVITY TIMELINE</h4>
            <div className="space-y-0">
              {w.activity.map((a, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                      a.action === "Completed" ? "bg-[#22C55E]" :
                      a.action === "Approved" ? "bg-[#22C55E]" :
                      a.action === "Rejected" ? "bg-[#EF4444]" :
                      a.action === "Processing" ? "bg-[#0159C7]" :
                      "bg-[#D1D5DB]"
                    }`} />
                    {i < w.activity.length - 1 && <div className="w-px flex-1 bg-[#E8EBF0] my-1" />}
                  </div>
                  <div className="pb-4">
                    <div className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>{a.action}</div>
                    <div className="text-[#6B7280]" style={{ fontSize: 12 }}>By {a.by} · {a.time}</div>
                    {a.note && <div className="text-[#6B7280] mt-1 bg-[#F5F7FB] rounded-lg px-3 py-1.5" style={{ fontSize: 12 }}>{a.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {w.status === "Pending" && (
              <>
                <button onClick={onApprove} className="w-full flex items-center justify-center gap-2 py-3 bg-[#22C55E] text-white rounded-xl hover:bg-[#16A34A] transition-colors" style={{ fontSize: 14, fontWeight: 600 }}>
                  <Check className="w-4 h-4" /> Approve & Process
                </button>
                <button onClick={onReject} className="w-full flex items-center justify-center gap-2 py-3 bg-[#EF4444] text-white rounded-xl hover:bg-[#DC2626] transition-colors" style={{ fontSize: 14, fontWeight: 600 }}>
                  <X className="w-4 h-4" /> Reject Withdrawal
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ApproveModal({
  withdrawal,
  onClose,
  onConfirm,
}: {
  withdrawal: Withdrawal;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setLoading(true);
    setTimeout(() => { onConfirm(note); setLoading(false); }, 900);
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-[#272936]" style={{ fontSize: 18, fontWeight: 700 }}>Approve Withdrawal</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F5F7FB] flex items-center justify-center"><X className="w-5 h-5 text-[#6B7280]" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-[#22C55E]/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Send className="w-5 h-5 text-[#22C55E]" />
              <span className="text-[#272936]" style={{ fontSize: 14, fontWeight: 600 }}>Confirm bank transfer</span>
            </div>
            <div className="space-y-2">
              {[
                { label: "Amount", value: withdrawal.netAmount },
                { label: "To", value: `${withdrawal.accountName} · ${withdrawal.bank}` },
                { label: "Account", value: withdrawal.accountNumber },
              ].map((r) => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-[#6B7280]" style={{ fontSize: 13 }}>{r.label}</span>
                  <span className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Admin Note (optional)</label>
            <textarea
              className="w-full bg-[#F5F7FB] border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent resize-none"
              placeholder="Add an internal note..."
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ fontSize: 14 }}
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-[#6B7280] hover:bg-[#F5F7FB]" style={{ fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#22C55E] text-white rounded-xl hover:bg-[#16A34A] disabled:opacity-60" style={{ fontSize: 14, fontWeight: 600 }}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {loading ? "Processing..." : "Approve & Send"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function RejectModal({
  withdrawal,
  onClose,
  onConfirm,
}: {
  withdrawal: Withdrawal;
  onClose: () => void;
  onConfirm: (reason: string, note: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    const finalReason = reason === "Other" ? customReason : reason;
    if (!finalReason.trim()) {
      toast.error("Please select a rejection reason");
      return;
    }
    setLoading(true);
    setTimeout(() => { onConfirm(finalReason, note); setLoading(false); }, 900);
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-[#272936]" style={{ fontSize: 18, fontWeight: 700 }}>Reject Withdrawal</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F5F7FB] flex items-center justify-center"><X className="w-5 h-5 text-[#6B7280]" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-[#EF4444]/10 rounded-xl p-4 flex items-center gap-3">
            <XCircle className="w-6 h-6 text-[#EF4444]" />
            <div>
              <div className="text-[#272936]" style={{ fontSize: 14, fontWeight: 600 }}>Reject {withdrawal.amount} withdrawal</div>
              <div className="text-[#6B7280]" style={{ fontSize: 13 }}>By {withdrawal.user} · {withdrawal.bank}</div>
            </div>
          </div>
          <div>
            <label className="block text-[#272936] mb-2" style={{ fontSize: 13, fontWeight: 600 }}>Rejection Reason *</label>
            <div className="space-y-1.5">
              {rejectionReasons.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl transition-colors flex items-center justify-between ${
                    reason === r ? "bg-[#EF4444] text-white" : "bg-[#F5F7FB] text-[#272936] hover:bg-[#E8EBF0]"
                  }`}
                  style={{ fontSize: 13, fontWeight: 500 }}
                >
                  {r}
                  {reason === r && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
          {reason === "Other" && (
            <div>
              <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Custom Reason *</label>
              <input
                className="w-full bg-[#F5F7FB] border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#EF4444] focus:border-transparent"
                placeholder="Describe the reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                style={{ fontSize: 14 }}
              />
            </div>
          )}
          <div>
            <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Admin Note (optional)</label>
            <textarea
              className="w-full bg-[#F5F7FB] border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#EF4444] focus:border-transparent resize-none"
              placeholder="Internal note..."
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ fontSize: 14 }}
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-[#6B7280] hover:bg-[#F5F7FB]" style={{ fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#EF4444] text-white rounded-xl hover:bg-[#DC2626] disabled:opacity-60" style={{ fontSize: 14, fontWeight: 600 }}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            {loading ? "Processing..." : "Confirm Reject"}
          </button>
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

function AdvancedFilterPanel({
  bankFilter, setBankFilter,
  onClear, onClose,
}: {
  bankFilter: string; setBankFilter: (v: string) => void;
  onClear: () => void; onClose: () => void;
}) {
  const activeCount = [bankFilter].filter(Boolean).length;
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute right-0 sm:right-0 left-0 sm:left-auto top-12 bg-white rounded-xl shadow-xl border border-border p-5 sm:w-64 z-20">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[#272936]" style={{ fontSize: 14, fontWeight: 700 }}>Filters</span>
        {activeCount > 0 && (
          <button onClick={onClear} className="text-[#EF4444]" style={{ fontSize: 12, fontWeight: 600 }}>Clear all</button>
        )}
      </div>
      <div>
        <label className="block text-[#6B7280] mb-1.5" style={{ fontSize: 12, fontWeight: 600 }}>BANK</label>
        <select value={bankFilter} onChange={(e) => setBankFilter(e.target.value)} className="w-full bg-[#F5F7FB] rounded-lg px-3 py-2 outline-none border border-border focus:border-[#0159C7]" style={{ fontSize: 13 }}>
          <option value="">All Banks</option>
          {allBanks.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <button onClick={onClose} className="w-full mt-4 py-2 bg-[#0159C7] text-white rounded-lg" style={{ fontSize: 13, fontWeight: 600 }}>Apply Filter</button>
    </motion.div>
  );
}

// ── Main ──
const ITEMS_PER_PAGE = 6;

export function WithdrawalsPage() {
  const { hasPermission } = useAdminAuth();
  const canApprove = hasPermission("withdrawals.approve");
  const canReject = hasPermission("withdrawals.reject");
  const canExport = hasPermission("withdrawals.export");
  const canTakeAction = canApprove || canReject;

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"All" | Status>("All");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [bankFilter, setBankFilter] = useState("");

  // Modals / drawers
  const [drawerWithdrawal, setDrawerWithdrawal] = useState<Withdrawal | null>(null);
  const [approveTarget, setApproveTarget] = useState<Withdrawal | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Withdrawal | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; confirmLabel: string; confirmColor: string; onConfirm: () => void } | null>(null);

  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) setActionMenu(null);
    };
    if (actionMenu !== null) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [actionMenu]);

  // Fetch withdrawals from backend
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    api.get<PaginatedResponse<BackendWithdrawal>>("/admin/withdrawals?limit=100&page=1")
      .then((res) => {
        if (cancelled) return;
        const statusMap: Record<string, Status> = {
          pending: "Pending", processing: "Processing", paid: "Completed", failed: "Rejected", reversed: "Rejected",
        };
        const mapped: Withdrawal[] = res.data.map((w) => ({
          id: w.id,
          user: w.user.fullName,
          userEmail: w.user.email,
          bank: w.bankName,
          accountName: w.accountName,
          accountNumber: w.accountNumber,
          amount: `₦${w.amount.toLocaleString()}`,
          amountNum: w.amount,
          fee: "₦50",
          feeNum: 50,
          netAmount: `₦${(w.amount - 50).toLocaleString()}`,
          netAmountNum: w.amount - 50,
          status: statusMap[w.status] ?? "Pending",
          date: new Date(w.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          time: new Date(w.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          walletBalance: "—",
          walletBalanceNum: 0,
          reference: w.reference,
          adminNote: w.adminNote ?? undefined,
          activity: [],
        }));
        setWithdrawals(mapped);
      })
      .catch(() => toast.error("Failed to load withdrawals"))
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const tabs: ("All" | Status)[] = ["All", "Pending", "Processing", "Completed", "Rejected"];
  const advFilterCount = [bankFilter].filter(Boolean).length;

  // ── Filter / Sort ──
  const filtered = useMemo(() => {
    let list = withdrawals.filter((w) => {
      const q = search.toLowerCase();
      const matchSearch = !q || w.user.toLowerCase().includes(q) || w.bank.toLowerCase().includes(q) || w.id.toLowerCase().includes(q) || w.accountNumber.includes(q);
      const matchTab = tab === "All" || w.status === tab;
      const matchBank = !bankFilter || w.bank === bankFilter;
      return matchSearch && matchTab && matchBank;
    });

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "id": cmp = a.id.localeCompare(b.id); break;
        case "user": cmp = a.user.localeCompare(b.user); break;
        case "bank": cmp = a.bank.localeCompare(b.bank); break;
        case "amountNum": cmp = a.amountNum - b.amountNum; break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "date": cmp = a.id.localeCompare(b.id); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [withdrawals, search, tab, bankFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, tab, bankFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Selection ──
  const allOnPageSelected = paginated.length > 0 && paginated.every((w) => selectedIds.has(w.id));
  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      const n = new Set(selectedIds);
      paginated.forEach((w) => n.delete(w.id));
      setSelectedIds(n);
    } else {
      const n = new Set(selectedIds);
      paginated.forEach((w) => n.add(w.id));
      setSelectedIds(n);
    }
  };
  const toggleSelect = (id: string) => {
    const n = new Set(selectedIds);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelectedIds(n);
  };

  // ── Actions ──
  const generateRef = () => `TRF-${Math.floor(100000000 + Math.random() * 900000000)}`;

  const approveWithdrawal = useCallback((id: string, note: string) => {
    api.patch(`/admin/withdrawals/${id}/status`, { status: "processing", adminNote: note || undefined })
      .then(() => {
        setWithdrawals((prev) => prev.map((w) => w.id === id ? { ...w, status: "Processing" as Status, adminNote: note || undefined, activity: [...w.activity, { action: "Approved", by: "Admin", time: "Just now", note: note || "Approved for processing" }] } : w));
        toast.success("Withdrawal approved — processing transfer...");
        setApproveTarget(null);
        setDrawerWithdrawal(null);
      })
      .catch(() => toast.error("Failed to approve withdrawal"));
  }, []);

  const rejectWithdrawal = useCallback((id: string, reason: string, note: string) => {
    api.patch(`/admin/withdrawals/${id}/status`, { status: "failed", adminNote: note || reason })
      .then(() => {
        setWithdrawals((prev) => prev.map((w) => w.id === id ? { ...w, status: "Rejected" as Status, rejectionReason: reason, adminNote: note || undefined, activity: [...w.activity, { action: "Rejected", by: "Admin", time: "Just now", note: reason }] } : w));
        toast.success("Withdrawal rejected — funds returned to user wallet");
        setRejectTarget(null);
        setDrawerWithdrawal(null);
      })
      .catch(() => toast.error("Failed to reject withdrawal"));
  }, []);

  const bulkApprove = () => {
    const pending = [...selectedIds].filter((id) => {
      const w = withdrawals.find((x) => x.id === id);
      return w && w.status === "Pending";
    });
    pending.forEach((id) => approveWithdrawal(id, "Bulk approved"));
    toast.success(`${pending.length} withdrawal(s) approved for processing`);
    setSelectedIds(new Set());
    setConfirmModal(null);
  };

  const bulkReject = () => {
    const pending = [...selectedIds].filter((id) => {
      const w = withdrawals.find((x) => x.id === id);
      return w && w.status === "Pending";
    });
    pending.forEach((id) => rejectWithdrawal(id, "Bulk rejection", ""));
    toast.success(`${pending.length} withdrawal(s) rejected`);
    setSelectedIds(new Set());
    setConfirmModal(null);
  };

  const exportCSV = () => {
    const header = "ID,User,Email,Bank,Account Name,Account Number,Amount,Fee,Net Amount,Status,Date,Reference\n";
    const rows = filtered.map((w) => `"${w.id}","${w.user}","${w.userEmail}","${w.bank}","${w.accountName}","${w.accountNumber}","${w.amount}","${w.fee}","${w.netAmount}","${w.status}","${w.date} ${w.time}","${w.reference || ""}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cardcentrals-withdrawals.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Withdrawals exported to CSV");
  };

  // ── Stats ──
  const pendingCount = withdrawals.filter((w) => w.status === "Pending").length;
  const processingCount = withdrawals.filter((w) => w.status === "Processing").length;
  const completedCount = withdrawals.filter((w) => w.status === "Completed").length;
  const rejectedCount = withdrawals.filter((w) => w.status === "Rejected").length;
  const totalPending = withdrawals.filter((w) => w.status === "Pending").reduce((a, w) => a + w.amountNum, 0);
  const totalCompleted = withdrawals.filter((w) => w.status === "Completed").reduce((a, w) => a + w.netAmountNum, 0);

  const SortIcon = ({ col }: { col: SortKey }) => (
    <ArrowUpDown className={`w-3.5 h-3.5 inline-block ml-1 ${sortKey === col ? "text-[#0159C7]" : "text-[#9CA3AF]"}`} />
  );

  return (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[#272936] truncate" style={{ fontSize: 24, fontWeight: 700 }}>Withdrawal Management</h1>
          <p className="text-[#6B7280] truncate" style={{ fontSize: 14 }}>Process and manage user withdrawal requests · {filtered.length} results</p>
        </div>
        {canExport && (
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-[#6B7280] hover:bg-[#F5F7FB] transition-colors" style={{ fontSize: 13, fontWeight: 500 }}>
            <Download className="w-4 h-4" /> Export
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending Amount", value: `₦${totalPending.toLocaleString()}`, sub: `${pendingCount} request(s)`, color: "#F59E0B", icon: Clock, flt: "Pending" as const },
          { label: "Processing", value: String(processingCount), sub: "In transit", color: "#0159C7", icon: RefreshCw, flt: "Processing" as const },
          { label: "Completed", value: `₦${totalCompleted.toLocaleString()}`, sub: `${completedCount} paid out`, color: "#22C55E", icon: CheckCircle, flt: "Completed" as const },
          { label: "Rejected", value: String(rejectedCount), sub: "Declined", color: "#EF4444", icon: XCircle, flt: "Rejected" as const },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => setTab(s.flt)}
            className={`bg-white rounded-2xl p-4 sm:p-5 border text-left transition-all min-w-0 overflow-hidden ${tab === s.flt ? "border-[#0159C7] ring-2 ring-[#0159C7]/10" : "border-border hover:border-[#D1D5DB]"}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${s.color}15` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
            </div>
            <div className="text-[#272936] truncate" style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
            <div className="text-[#6B7280] truncate" style={{ fontSize: 13 }}>{s.sub}</div>
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && canTakeAction && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-[#0159C7] rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-white" />
              <span className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>{selectedIds.size} selected</span>
            </div>
            <div className="flex items-center gap-2">
              {canApprove && (
                <button
                  onClick={() => setConfirmModal({
                    title: "Bulk Approve",
                    message: `Approve and process ${selectedIds.size} selected withdrawal(s)? Funds will be transferred to user bank accounts.`,
                    confirmLabel: "Approve All",
                    confirmColor: "#22C55E",
                    onConfirm: bulkApprove,
                  })}
                  className="px-3 py-1.5 bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A] transition-colors"
                  style={{ fontSize: 13, fontWeight: 500 }}
                >
                  Approve
                </button>
              )}
              {canReject && (
                <button
                  onClick={() => setConfirmModal({
                    title: "Bulk Reject",
                    message: `Reject ${selectedIds.size} selected withdrawal(s)? Funds will be returned to user wallets.`,
                    confirmLabel: "Reject All",
                    confirmColor: "#EF4444",
                    onConfirm: bulkReject,
                  })}
                  className="px-3 py-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                  style={{ fontSize: 13, fontWeight: 500 }}
                >
                  Reject
                </button>
              )}
              <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-white/70 hover:text-white" style={{ fontSize: 13 }}>Clear</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 bg-[#F5F7FB] rounded-xl px-3 sm:px-4 py-2 flex-1 min-w-0">
              <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
              <input
                type="text"
                placeholder="Search by user, bank, ID..."
                className="bg-transparent border-none outline-none text-[#272936] w-full min-w-0"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: 14 }}
              />
              {search && <button onClick={() => setSearch("")}><X className="w-4 h-4 text-[#9CA3AF] hover:text-[#272936] shrink-0" /></button>}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-colors whitespace-nowrap ${
                  showFilterPanel || advFilterCount > 0 ? "border-[#0159C7] text-[#0159C7] bg-[#EEF2FF]" : "border-border text-[#6B7280] hover:bg-[#F5F7FB]"
                }`}
                style={{ fontSize: 14 }}
              >
                <Filter className="w-4 h-4" /> Filter
                {advFilterCount > 0 && (
                  <span className="w-5 h-5 bg-[#0159C7] text-white rounded-full flex items-center justify-center" style={{ fontSize: 10, fontWeight: 700 }}>{advFilterCount}</span>
                )}
              </button>
              <AnimatePresence>
                {showFilterPanel && (
                  <AdvancedFilterPanel
                    bankFilter={bankFilter} setBankFilter={setBankFilter}
                    onClear={() => setBankFilter("")}
                    onClose={() => setShowFilterPanel(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {tabs.map((t) => {
              const count = t === "All" ? withdrawals.length : withdrawals.filter((w) => w.status === t).length;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                    tab === t ? "bg-[#0159C7] text-white" : "bg-[#F5F7FB] text-[#6B7280] hover:text-[#272936]"
                  }`}
                  style={{ fontSize: 13, fontWeight: 500 }}
                >
                  {t}
                  <span className={`px-1.5 py-0.5 rounded-full ${tab === t ? "bg-white/20 text-white" : "bg-[#E8EBF0] text-[#6B7280]"}`} style={{ fontSize: 11, fontWeight: 600 }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-border">
          {paginated.length === 0 && (
            <div className="text-center py-16">
              <div className="text-[#6B7280]" style={{ fontSize: 14 }}>No withdrawals match your criteria.</div>
              <button onClick={() => { setSearch(""); setTab("All"); setBankFilter(""); }} className="text-[#0159C7] mt-2" style={{ fontSize: 13, fontWeight: 600 }}>Clear all filters</button>
            </div>
          )}
          {paginated.map((w) => (
            <div key={w.id} className={`p-4 transition-colors ${selectedIds.has(w.id) ? "bg-[#EEF2FF]" : ""}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedIds.has(w.id)} onChange={() => toggleSelect(w.id)} className="w-4 h-4 rounded border-[#D1D5DB] text-[#0159C7] accent-[#0159C7] mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="text-[#272936] truncate" style={{ fontSize: 14, fontWeight: 500 }}>{w.user}</div>
                      <div className="text-[#9CA3AF]" style={{ fontSize: 11 }}>{w.id} · {w.date}</div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0 ${statusColors[w.status]}`} style={{ fontSize: 11, fontWeight: 600 }}>
                      {w.status === "Processing" && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {w.status === "Pending" && <Clock className="w-3 h-3" />}
                      {w.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center bg-[#0159C7]/10 shrink-0">
                      <Building2 className="w-3 h-3 text-[#0159C7]" />
                    </div>
                    <span className="text-[#6B7280]" style={{ fontSize: 12 }}>{w.bank} · {w.accountNumber}</span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-[#F5F7FB] rounded-lg px-2.5 py-1.5 text-center flex-1">
                      <div className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>{w.amount}</div>
                      <div className="text-[#9CA3AF]" style={{ fontSize: 10 }}>Amount</div>
                    </div>
                    <div className="bg-[#F5F7FB] rounded-lg px-2.5 py-1.5 text-center flex-1">
                      <div className="text-[#6B7280]" style={{ fontSize: 13, fontWeight: 500 }}>{w.fee}</div>
                      <div className="text-[#9CA3AF]" style={{ fontSize: 10 }}>Fee</div>
                    </div>
                    <div className="bg-[#F5F7FB] rounded-lg px-2.5 py-1.5 text-center flex-1">
                      <div className="text-[#0159C7]" style={{ fontSize: 13, fontWeight: 600 }}>{w.netAmount}</div>
                      <div className="text-[#9CA3AF]" style={{ fontSize: 10 }}>Net</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setDrawerWithdrawal(w)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#F5F7FB] text-[#6B7280] rounded-lg hover:bg-[#E8EBF0] transition-colors" style={{ fontSize: 12, fontWeight: 500 }}><Eye className="w-3.5 h-3.5" /> View</button>
                    {w.status === "Pending" && canTakeAction && (
                      <>
                        {canApprove && (
                          <button onClick={() => setApproveTarget(w)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#22C55E]/10 text-[#22C55E] rounded-lg hover:bg-[#22C55E]/20 transition-colors" style={{ fontSize: 12, fontWeight: 500 }}><CheckCircle className="w-3.5 h-3.5" /> Approve</button>
                        )}
                        {canReject && (
                          <button onClick={() => setRejectTarget(w)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#EF4444]/10 text-[#EF4444] rounded-lg hover:bg-[#EF4444]/20 transition-colors" style={{ fontSize: 12, fontWeight: 500 }}><XCircle className="w-3.5 h-3.5" /> Reject</button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F5F7FB]">
                <th className="px-5 py-3 w-10">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll} className="w-4 h-4 rounded border-[#D1D5DB] text-[#0159C7] cursor-pointer accent-[#0159C7]" />
                </th>
                {([
                  { key: "id" as SortKey, label: "ID" },
                  { key: "user" as SortKey, label: "USER" },
                  { key: "bank" as SortKey, label: "BANK" },
                  { key: null, label: "ACCOUNT" },
                  { key: "amountNum" as SortKey, label: "AMOUNT" },
                  { key: null, label: "NET" },
                  { key: "status" as SortKey, label: "STATUS" },
                  { key: "date" as SortKey, label: "DATE" },
                  { key: null, label: "ACTIONS" },
                ] as const).map((col) => (
                  <th
                    key={col.label}
                    className={`text-left px-5 py-3 text-[#6B7280] ${col.key ? "cursor-pointer hover:text-[#272936] select-none" : ""}`}
                    style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em" }}
                    onClick={() => col.key && toggleSort(col.key)}
                  >
                    {col.label}
                    {col.key && <SortIcon col={col.key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-16">
                    <div className="text-[#6B7280]" style={{ fontSize: 14 }}>No withdrawals match your criteria.</div>
                    <button onClick={() => { setSearch(""); setTab("All"); setBankFilter(""); }} className="text-[#0159C7] mt-2" style={{ fontSize: 13, fontWeight: 600 }}>Clear all filters</button>
                  </td>
                </tr>
              )}
              {paginated.map((w) => (
                <tr key={w.id} className={`border-t border-border transition-colors ${selectedIds.has(w.id) ? "bg-[#EEF2FF]" : "hover:bg-[#F5F7FB]/50"}`}>
                  <td className="px-5 py-4">
                    <input type="checkbox" checked={selectedIds.has(w.id)} onChange={() => toggleSelect(w.id)} className="w-4 h-4 rounded border-[#D1D5DB] text-[#0159C7] cursor-pointer accent-[#0159C7]" />
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => { setDrawerWithdrawal(w); }} className="text-[#0159C7] hover:underline" style={{ fontSize: 13, fontWeight: 600 }}>{w.id}</button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[#272936]" style={{ fontSize: 13 }}>{w.user}</div>
                    <div className="text-[#9CA3AF]" style={{ fontSize: 11 }}>{w.userEmail}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#0159C7]/10 shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-[#0159C7]" />
                      </div>
                      <span className="text-[#272936]" style={{ fontSize: 13, fontWeight: 500 }}>{w.bank}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[#6B7280]" style={{ fontSize: 13 }}>{w.accountNumber}</td>
                  <td className="px-5 py-4 text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>{w.amount}</td>
                  <td className="px-5 py-4 text-[#0159C7]" style={{ fontSize: 13, fontWeight: 600 }}>{w.netAmount}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${statusColors[w.status]}`} style={{ fontSize: 12, fontWeight: 600 }}>
                      {w.status === "Processing" && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {w.status === "Pending" && <Clock className="w-3 h-3" />}
                      {w.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[#6B7280]" style={{ fontSize: 13 }}>{w.date}</div>
                    <div className="text-[#9CA3AF]" style={{ fontSize: 11 }}>{w.time}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="relative" ref={actionMenu === w.id ? actionMenuRef : undefined}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === w.id ? null : w.id); }}
                        className="p-1.5 hover:bg-[#F5F7FB] rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-[#6B7280]" />
                      </button>
                      <AnimatePresence>
                        {actionMenu === w.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-border py-1.5 w-48 z-20"
                          >
                            <button
                              onClick={() => { setDrawerWithdrawal(w); setActionMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#272936] hover:bg-[#F5F7FB] transition-colors"
                              style={{ fontSize: 13 }}
                            >
                              <Eye className="w-4 h-4 text-[#6B7280]" /> View Details
                            </button>
                            {canTakeAction && (
                              <button
                                onClick={() => { navigator.clipboard.writeText(w.id); toast.success("ID copied!"); setActionMenu(null); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#272936] hover:bg-[#F5F7FB] transition-colors"
                                style={{ fontSize: 13 }}
                              >
                                <Copy className="w-4 h-4 text-[#6B7280]" /> Copy ID
                              </button>
                            )}
                            {w.status === "Pending" && canTakeAction && (
                              <>
                                <div className="mx-3 my-1 border-t border-border" />
                                {canApprove && (
                                  <button
                                    onClick={() => { setApproveTarget(w); setActionMenu(null); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#22C55E] hover:bg-[#22C55E]/5 transition-colors"
                                    style={{ fontSize: 13 }}
                                  >
                                    <CheckCircle className="w-4 h-4" /> Approve & Process
                                  </button>
                                )}
                                {canReject && (
                                  <button
                                    onClick={() => { setRejectTarget(w); setActionMenu(null); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#EF4444] hover:bg-[#EF4444]/5 transition-colors"
                                    style={{ fontSize: 13 }}
                                  >
                                    <XCircle className="w-4 h-4" /> Reject
                                  </button>
                                )}
                              </>
                            )}
                            {w.reference && (
                              <>
                                <div className="mx-3 my-1 border-t border-border" />
                                <button
                                  onClick={() => { navigator.clipboard.writeText(w.reference!); toast.success("Reference copied!"); setActionMenu(null); }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#272936] hover:bg-[#F5F7FB] transition-colors"
                                  style={{ fontSize: 13 }}
                                >
                                  <CreditCard className="w-4 h-4 text-[#6B7280]" /> Copy Reference
                                </button>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 sm:px-6 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[#6B7280]" style={{ fontSize: 13 }}>
            Showing {filtered.length > 0 ? (safePage - 1) * ITEMS_PER_PAGE + 1 : 0}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-center">
            <button onClick={() => setPage(1)} disabled={safePage === 1} className="px-2 sm:px-3 py-1.5 rounded-lg text-[#6B7280] hover:bg-[#F5F7FB] disabled:opacity-30" style={{ fontSize: 13 }}>First</button>
            <button onClick={() => setPage(safePage - 1)} disabled={safePage === 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F5F7FB] disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${p === safePage ? "bg-[#0159C7] text-white" : "text-[#6B7280] hover:bg-[#F5F7FB]"}`} style={{ fontSize: 13, fontWeight: p === safePage ? 600 : 400 }}>{p}</button>
            ))}
            <button onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F5F7FB] disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className="px-2 sm:px-3 py-1.5 rounded-lg text-[#6B7280] hover:bg-[#F5F7FB] disabled:opacity-30" style={{ fontSize: 13 }}>Last</button>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {drawerWithdrawal && (
          <WithdrawalDrawer
            key="drawer"
            withdrawal={drawerWithdrawal}
            onClose={() => setDrawerWithdrawal(null)}
            onApprove={canApprove ? () => setApproveTarget(drawerWithdrawal) : undefined}
            onReject={canReject ? () => setRejectTarget(drawerWithdrawal) : undefined}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {approveTarget && (
          <ApproveModal
            key="approve"
            withdrawal={approveTarget}
            onClose={() => setApproveTarget(null)}
            onConfirm={(note) => approveWithdrawal(approveTarget.id, note)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rejectTarget && (
          <RejectModal
            key="reject"
            withdrawal={rejectTarget}
            onClose={() => setRejectTarget(null)}
            onConfirm={(reason, note) => rejectWithdrawal(rejectTarget.id, reason, note)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal && (
          <ConfirmModal
            key="confirm"
            title={confirmModal.title}
            message={confirmModal.message}
            confirmLabel={confirmModal.confirmLabel}
            confirmColor={confirmModal.confirmColor}
            onClose={() => setConfirmModal(null)}
            onConfirm={confirmModal.onConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
