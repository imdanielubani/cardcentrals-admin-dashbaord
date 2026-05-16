import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search, Filter, MoreVertical, Mail, Ban, Eye, Download,
  ChevronLeft, ChevronRight, X, CheckCircle, ArrowUpDown,
  Trash2, RefreshCw, CreditCard, Banknote, Clock,
  Shield, AlertTriangle, Check, Copy, Phone, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { api } from "../../../lib/api";
import type { AdminUser as BackendUser, AdminUserDetail, PaginatedResponse } from "../../../types";

// ── Types ──
interface UserTransaction {
  id: string;
  type: "giftcard" | "withdrawal";
  description: string;
  amount: string;
  status: "Approved" | "Pending" | "Rejected" | "Completed";
  date: string;
  brandLogo?: string | null;
}

const formatLastActive = (iso: string | null | undefined): string => {
  if (!iso) return "Never";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

interface User {
  id: number;
  backendId?: string;
  name: string;
  email: string;
  phone: string;
  trades: number;
  balance: string;
  balanceNum: number;
  status: "Active" | "Suspended" | "Pending";
  joined: string;
  lastActive: string;
  kycVerified: boolean;
  transactions: UserTransaction[];
}

type SortKey = "name" | "trades" | "balanceNum" | "joined" | "status";
type SortDir = "asc" | "desc";

// ── Subcomponents ──

function GiftcardLogo({ src }: { src?: string | null }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className="w-8 h-8 rounded-lg bg-[#0159C7]/10 flex items-center justify-center">
        <CreditCard className="w-4 h-4 text-[#0159C7]" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center overflow-hidden">
      <img
        src={src}
        alt=""
        className="w-full h-full object-contain"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

function UserProfileDrawer({
  user,
  onClose,
  onSuspend,
  onActivate,
  onDelete,
  onEmail,
}: {
  user: User;
  onClose: () => void;
  onSuspend: () => void;
  onActivate: () => void;
  onDelete: () => void;
  onEmail: () => void;
}) {
  const [txTab, setTxTab] = useState<"all" | "giftcard" | "withdrawal">("all");
  const [txLoading, setTxLoading] = useState(false);
  const [txItems, setTxItems] = useState<UserTransaction[]>(user.transactions);
  const [lastActive, setLastActive] = useState<string>(user.lastActive);

  // Fetch the user's gift-card and withdrawal history from the backend whenever
  // the drawer opens for a different user. The list endpoint can't carry every
  // transaction per user, so this is intentionally a second roundtrip.
  useEffect(() => {
    if (!user.backendId) {
      setTxItems(user.transactions);
      return;
    }
    let cancelled = false;
    setTxLoading(true);
    api.get<AdminUserDetail>(`/admin/users/${user.backendId}`)
      .then((detail) => {
        if (cancelled) return;
        setLastActive(formatLastActive(detail.lastActiveAt));
        const giftcards: UserTransaction[] = (detail.giftCardTxns ?? []).map((g) => ({
          id: g.reference || g.id,
          type: "giftcard",
          description: `${g.brandName} $${g.amount}`,
          amount: `+₦${g.payout.toLocaleString()}`,
          status:
            g.status === "completed" ? "Completed" :
            g.status === "rejected" ? "Rejected" :
            g.status === "flagged" ? "Rejected" :
            g.status === "processing" ? "Pending" : "Pending",
          date: new Date(g.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          brandLogo: g.brandLogo ?? null,
        }));
        const withdrawals: UserTransaction[] = (detail.withdrawals ?? []).map((w) => {
          const masked = w.accountNumber && w.accountNumber.length >= 4
            ? `****${w.accountNumber.slice(-4)}`
            : w.accountNumber ?? "";
          return {
            id: w.reference || w.id,
            type: "withdrawal",
            description: [w.bankName, masked].filter(Boolean).join(" ") || "Withdrawal",
            amount: `-₦${w.amount.toLocaleString()}`,
            status:
              w.status === "paid" ? "Completed" :
              w.status === "failed" || w.status === "reversed" ? "Rejected" : "Pending",
            date: new Date(w.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          };
        });
        const merged = [...giftcards, ...withdrawals].sort((a, b) =>
          a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
        );
        setTxItems(merged);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load user transactions");
      })
      .finally(() => { if (!cancelled) setTxLoading(false); });
    return () => { cancelled = true; };
  }, [user.backendId, user.transactions]);

  const filteredTx = txItems.filter(
    (t) => txTab === "all" || t.type === txTab
  );

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
        className="relative w-full max-w-lg bg-white h-full overflow-auto shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-[#272936]" style={{ fontSize: 18, fontWeight: 700 }}>User Profile</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F5F7FB] flex items-center justify-center">
            <X className="w-5 h-5 text-[#6B7280]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile header */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#0159C7] rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-white" style={{ fontSize: 24, fontWeight: 700 }}>{user.name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[#272936] truncate" style={{ fontSize: 20, fontWeight: 700 }}>{user.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full ${
                    user.status === "Active" ? "bg-[#22C55E]/10 text-[#22C55E]" :
                    user.status === "Suspended" ? "bg-[#EF4444]/10 text-[#EF4444]" :
                    "bg-[#F59E0B]/10 text-[#F59E0B]"
                  }`}
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  {user.status}
                </span>
                {user.kycVerified && (
                  <span className="inline-flex items-center gap-1 bg-[#0159C7]/10 text-[#0159C7] px-2 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600 }}>
                    <Shield className="w-3 h-3" /> KYC Verified
                  </span>
                )}
                {!user.kycVerified && (
                  <span className="inline-flex items-center gap-1 bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600 }}>
                    <AlertTriangle className="w-3 h-3" /> Unverified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 bg-[#F5F7FB] rounded-xl px-4 py-3">
              <Mail className="w-4 h-4 text-[#6B7280]" />
              <span className="text-[#272936] flex-1" style={{ fontSize: 14 }}>{user.email}</span>
              <button onClick={() => { navigator.clipboard.writeText(user.email); toast.success("Email copied!"); }} className="text-[#0159C7]">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 bg-[#F5F7FB] rounded-xl px-4 py-3">
              <Phone className="w-4 h-4 text-[#6B7280]" />
              <span className="text-[#272936] flex-1" style={{ fontSize: 14 }}>{user.phone}</span>
              <button onClick={() => { navigator.clipboard.writeText(user.phone); toast.success("Phone copied!"); }} className="text-[#0159C7]">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 bg-[#F5F7FB] rounded-xl px-4 py-3">
              <Calendar className="w-4 h-4 text-[#6B7280]" />
              <span className="text-[#6B7280]" style={{ fontSize: 13 }}>Joined</span>
              <span className="text-[#272936] ml-auto" style={{ fontSize: 14, fontWeight: 500 }}>{user.joined}</span>
            </div>
            <div className="flex items-center gap-3 bg-[#F5F7FB] rounded-xl px-4 py-3">
              <Clock className="w-4 h-4 text-[#6B7280]" />
              <span className="text-[#6B7280]" style={{ fontSize: 13 }}>Last Active</span>
              <span className="text-[#272936] ml-auto" style={{ fontSize: 14, fontWeight: 500 }}>{lastActive}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#F5F7FB] rounded-xl p-4 text-center">
              <div className="text-[#272936]" style={{ fontSize: 20, fontWeight: 700 }}>{user.trades}</div>
              <div className="text-[#6B7280]" style={{ fontSize: 12 }}>Total Trades</div>
            </div>
            <div className="bg-[#F5F7FB] rounded-xl p-4 text-center">
              <div className="text-[#0159C7]" style={{ fontSize: 20, fontWeight: 700 }}>{user.balance}</div>
              <div className="text-[#6B7280]" style={{ fontSize: 12 }}>Balance</div>
            </div>
            <div className="bg-[#F5F7FB] rounded-xl p-4 text-center">
              <div className="text-[#272936]" style={{ fontSize: 20, fontWeight: 700 }}>
                {txLoading && txItems.length === 0 ? "—" : txItems.length}
              </div>
              <div className="text-[#6B7280]" style={{ fontSize: 12 }}>Transactions</div>
            </div>
          </div>

          {/* Wallet */}
          <div className="bg-gradient-to-r from-[#0159C7] to-[#126CF8] rounded-2xl p-5">
            <div className="text-white/70" style={{ fontSize: 12 }}>Wallet Balance</div>
            <div className="text-white mt-1" style={{ fontSize: 28, fontWeight: 700 }}>{user.balance}</div>
          </div>

          {/* Transactions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[#272936]" style={{ fontSize: 15, fontWeight: 700 }}>Transactions</h4>
            </div>
            <div className="flex gap-2 mb-3">
              {([["all", "All"], ["giftcard", "Giftcards"], ["withdrawal", "Withdrawals"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTxTab(key)}
                  className={`px-3 py-1.5 rounded-lg ${txTab === key ? "bg-[#0159C7] text-white" : "bg-[#F5F7FB] text-[#6B7280]"}`}
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {txLoading && txItems.length === 0 && (
                <div className="text-center py-8 text-[#6B7280]" style={{ fontSize: 14 }}>Loading transactions…</div>
              )}
              {!txLoading && filteredTx.length === 0 && (
                <div className="text-center py-8 text-[#6B7280]" style={{ fontSize: 14 }}>No transactions found</div>
              )}
              {filteredTx.map((tx) => (
                <div key={tx.id} className="bg-[#F5F7FB] rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {tx.type === "giftcard" ? (
                      <GiftcardLogo src={tx.brandLogo} />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 flex items-center justify-center">
                        <Banknote className="w-4 h-4 text-[#22C55E]" />
                      </div>
                    )}
                    <div>
                      <div className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>{tx.description}</div>
                      <div className="text-[#6B7280]" style={{ fontSize: 11 }}>{tx.date} · {tx.id}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={tx.amount.startsWith("+") ? "text-[#22C55E]" : "text-[#EF4444]"} style={{ fontSize: 13, fontWeight: 700 }}>
                      {tx.amount}
                    </div>
                    <span
                      className={`${
                        tx.status === "Approved" || tx.status === "Completed" ? "text-[#22C55E]" :
                        tx.status === "Pending" ? "text-[#F59E0B]" : "text-[#EF4444]"
                      }`}
                      style={{ fontSize: 11, fontWeight: 500 }}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={onEmail}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#0159C7] text-white rounded-xl hover:bg-[#014BA8] transition-colors"
              style={{ fontSize: 14, fontWeight: 600 }}
            >
              <Mail className="w-4 h-4" /> Send Email
            </button>
            {user.status === "Active" || user.status === "Pending" ? (
              <button
                onClick={onSuspend}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#EF4444]/10 text-[#EF4444] rounded-xl hover:bg-[#EF4444]/20 transition-colors"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                <Ban className="w-4 h-4" /> Suspend User
              </button>
            ) : (
              <button
                onClick={onActivate}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#22C55E]/10 text-[#22C55E] rounded-xl hover:bg-[#22C55E]/20 transition-colors"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                <CheckCircle className="w-4 h-4" /> Reactivate User
              </button>
            )}
            <button
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 py-3 border border-[#EF4444]/30 text-[#EF4444] rounded-xl hover:bg-[#EF4444]/5 transition-colors"
              style={{ fontSize: 14, fontWeight: 600 }}
            >
              <Trash2 className="w-4 h-4" /> Delete User
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function EmailModal({
  user,
  onClose,
  onSend,
}: {
  user: User;
  onClose: () => void;
  onSend: (subject: string, message: string) => void;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!user.backendId) {
      toast.error("Cannot email: user is missing a backend ID");
      return;
    }
    setSending(true);
    api.post(`/admin/users/${user.backendId}/email`, { subject, message })
      .then(() => {
        onSend(subject, message);
      })
      .catch((err: Error) => {
        toast.error(err.message || "Failed to send email");
      })
      .finally(() => setSending(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-[#272936]" style={{ fontSize: 18, fontWeight: 700 }}>Send Email</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F5F7FB] flex items-center justify-center">
            <X className="w-5 h-5 text-[#6B7280]" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-[#F5F7FB] rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-[#6B7280]" style={{ fontSize: 13, fontWeight: 500 }}>To:</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#0159C7] rounded-full flex items-center justify-center">
                <span className="text-white" style={{ fontSize: 10, fontWeight: 700 }}>{user.name[0]}</span>
              </div>
              <span className="text-[#272936]" style={{ fontSize: 14, fontWeight: 500 }}>{user.name}</span>
              <span className="text-[#6B7280]" style={{ fontSize: 13 }}>({user.email})</span>
            </div>
          </div>
          <div>
            <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Subject</label>
            <input
              className="w-full bg-[#F5F7FB] border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0159C7] focus:border-transparent"
              placeholder="Enter email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ fontSize: 14 }}
            />
          </div>
          <div>
            <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Message</label>
            <textarea
              className="w-full bg-[#F5F7FB] border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0159C7] focus:border-transparent resize-none"
              placeholder="Write your message..."
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ fontSize: 14 }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-[#6B7280] hover:bg-[#F5F7FB]" style={{ fontSize: 14, fontWeight: 500 }}>
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0159C7] text-white rounded-xl hover:bg-[#014BA8] disabled:opacity-60"
            style={{ fontSize: 14, fontWeight: 600 }}
          >
            {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {sending ? "Sending..." : "Send Email"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmColor,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6"
      >
        <h3 className="text-[#272936] mb-2" style={{ fontSize: 18, fontWeight: 700 }}>{title}</h3>
        <p className="text-[#6B7280] mb-6" style={{ fontSize: 14, lineHeight: 1.6 }}>{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-[#6B7280] hover:bg-[#F5F7FB]" style={{ fontSize: 14, fontWeight: 500 }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-white rounded-xl hover:opacity-90"
            style={{ fontSize: 14, fontWeight: 600, backgroundColor: confirmColor }}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Component ──

const ITEMS_PER_PAGE = 6;

export function UsersPage() {
  const { hasPermission } = useAdminAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Suspended" | "Pending">("All");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modals
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [emailUser, setEmailUser] = useState<User | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor: string;
    onConfirm: () => void;
  } | null>(null);

  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Close action menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenu(null);
      }
    };
    if (actionMenu !== null) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [actionMenu]);

  // Fetch users from backend
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    api.get<PaginatedResponse<BackendUser>>("/admin/users?limit=100&page=1")
      .then((res) => {
        if (cancelled) return;
        const mapped: User[] = res.data.map((u, idx) => ({
          id: idx + 1,
          backendId: u.id,
          name: u.fullName,
          email: u.email,
          phone: u.phone || "—",
          trades: u._count?.giftCardTxns ?? 0,
          balance: `₦${(u.wallet?.availableBalance ?? 0).toLocaleString()}`,
          balanceNum: u.wallet?.availableBalance ?? 0,
          status: u.status === "suspended" ? "Suspended" : u.status === "deleted" ? "Suspended" : "Active",
          joined: new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          lastActive: formatLastActive(u.lastActiveAt),
          kycVerified: u.isEmailVerified,
          transactions: [],
        }));
        setUsers(mapped);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load users");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // ── Filtering, Sorting, Pagination ──
  const filtered = useMemo(() => {
    let list = users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.phone.includes(search);
      const matchStatus = statusFilter === "All" || u.status === statusFilter;
      return matchSearch && matchStatus;
    });

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "trades": cmp = a.trades - b.trades; break;
        case "balanceNum": cmp = a.balanceNum - b.balanceNum; break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "joined": cmp = a.joined.localeCompare(b.joined); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [users, search, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Selection ──
  const allOnPageSelected = paginated.length > 0 && paginated.every((u) => selectedIds.has(u.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      const newSet = new Set(selectedIds);
      paginated.forEach((u) => newSet.delete(u.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      paginated.forEach((u) => newSet.add(u.id));
      setSelectedIds(newSet);
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  // ── Actions ──
  const suspendUser = useCallback((id: number) => {
    const user = users.find((u) => u.id === id);
    if (!user?.backendId) return;
    api.patch(`/admin/users/${user.backendId}/status`, { status: "suspended" })
      .then(() => {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: "Suspended" as const } : u)));
        toast.success("User suspended successfully");
      })
      .catch(() => toast.error("Failed to suspend user"));
    setProfileUser(null);
    setActionMenu(null);
  }, [users]);

  const activateUser = useCallback((id: number) => {
    const user = users.find((u) => u.id === id);
    if (!user?.backendId) return;
    api.patch(`/admin/users/${user.backendId}/status`, { status: "active" })
      .then(() => {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: "Active" as const } : u)));
        toast.success("User activated successfully");
      })
      .catch(() => toast.error("Failed to activate user"));
    setProfileUser(null);
    setActionMenu(null);
  }, [users]);

  const deleteUser = useCallback((id: number) => {
    const target = users.find((u) => u.id === id);
    if (!target?.backendId) {
      toast.error("Cannot delete: user is missing a backend ID");
      return;
    }
    api.delete(`/admin/users/${target.backendId}`)
      .then(() => {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
        toast.success("User deleted. A confirmation email has been sent.");
      })
      .catch((err: Error) => {
        toast.error(err.message || "Failed to delete user");
      })
      .finally(() => {
        setProfileUser(null);
        setActionMenu(null);
        setConfirmModal(null);
      });
  }, [users]);

  const bulkSuspend = () => {
    setUsers((prev) =>
      prev.map((u) => (selectedIds.has(u.id) && u.status !== "Suspended" ? { ...u, status: "Suspended" as const } : u))
    );
    toast.success(`${selectedIds.size} user(s) suspended`);
    setSelectedIds(new Set());
    setConfirmModal(null);
  };

  const bulkDelete = () => {
    setUsers((prev) => prev.filter((u) => !selectedIds.has(u.id)));
    toast.success(`${selectedIds.size} user(s) deleted`);
    setSelectedIds(new Set());
    setConfirmModal(null);
  };

  const exportCSV = () => {
    const header = "Name,Email,Phone,Trades,Balance,Status,Joined\n";
    const rows = filtered.map((u) => `"${u.name}","${u.email}","${u.phone}",${u.trades},"${u.balance}","${u.status}","${u.joined}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cardcentrals-users.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Users exported to CSV");
  };

  // ── Stats ──
  const activeCount = users.filter((u) => u.status === "Active").length;
  const suspendedCount = users.filter((u) => u.status === "Suspended").length;
  const pendingCount = users.filter((u) => u.status === "Pending").length;

  const SortIcon = ({ col }: { col: SortKey }) => (
    <ArrowUpDown className={`w-3.5 h-3.5 inline-block ml-1 ${sortKey === col ? "text-[#0159C7]" : "text-[#9CA3AF]"}`} />
  );

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[#272936]" style={{ fontSize: 24, fontWeight: 700 }}>Users Management</h1>
          <p className="text-[#6B7280]" style={{ fontSize: 14 }}>{users.length} total users · {filtered.length} results</p>
        </div>
        <div className="flex items-center gap-3">
          {hasPermission("users.export") && (
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-[#6B7280] hover:bg-[#F5F7FB] transition-colors" style={{ fontSize: 13, fontWeight: 500 }}>
              <Download className="w-4 h-4" /> Export
            </button>
          )}

        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length, color: "#0159C7", filter: "All" as const },
          { label: "Active", value: activeCount, color: "#22C55E", filter: "Active" as const },
          { label: "Suspended", value: suspendedCount, color: "#EF4444", filter: "Suspended" as const },
          { label: "Pending", value: pendingCount, color: "#F59E0B", filter: "Pending" as const },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => { setStatusFilter(s.filter); setShowFilterPanel(false); }}
            className={`bg-white rounded-2xl p-5 border transition-all text-left ${statusFilter === s.filter ? "border-[#0159C7] ring-2 ring-[#0159C7]/10" : "border-border hover:border-[#D1D5DB]"}`}
          >
            <div className="text-[#272936]" style={{ fontSize: 28, fontWeight: 700 }}>{s.value}</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[#6B7280]" style={{ fontSize: 13 }}>{s.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#0159C7] rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-white" />
              <span className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>{selectedIds.size} user(s) selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setConfirmModal({
                    title: "Suspend Selected Users",
                    message: `Are you sure you want to suspend ${selectedIds.size} selected user(s)? They will lose access to their accounts.`,
                    confirmLabel: "Suspend All",
                    confirmColor: "#F59E0B",
                    onConfirm: bulkSuspend,
                  })
                }
                className="px-3 py-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                style={{ fontSize: 13, fontWeight: 500 }}
              >
                Suspend
              </button>
              <button
                onClick={() =>
                  setConfirmModal({
                    title: "Delete Selected Users",
                    message: `Are you sure you want to permanently delete ${selectedIds.size} user(s)? This action cannot be undone.`,
                    confirmLabel: "Delete All",
                    confirmColor: "#EF4444",
                    onConfirm: bulkDelete,
                  })
                }
                className="px-3 py-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                style={{ fontSize: 13, fontWeight: 500 }}
              >
                Delete
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-white/70 hover:text-white" style={{ fontSize: 13 }}>
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border">
        {/* Toolbar */}
        <div className="p-5 border-b border-border flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-[#F5F7FB] rounded-xl px-4 py-2 flex-1">
            <Search className="w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              className="bg-transparent border-none outline-none text-[#272936] w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: 14 }}
            />
            {search && (
              <button onClick={() => setSearch("")}><X className="w-4 h-4 text-[#9CA3AF] hover:text-[#272936]" /></button>
            )}
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-colors ${
                  showFilterPanel || statusFilter !== "All"
                    ? "border-[#0159C7] text-[#0159C7] bg-[#EEF2FF]"
                    : "border-border text-[#6B7280] hover:bg-[#F5F7FB]"
                }`}
                style={{ fontSize: 14 }}
              >
                <Filter className="w-4 h-4" /> Filter
                {statusFilter !== "All" && (
                  <span className="w-5 h-5 bg-[#0159C7] text-white rounded-full flex items-center justify-center" style={{ fontSize: 10, fontWeight: 700 }}>1</span>
                )}
              </button>
              <AnimatePresence>
                {showFilterPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute right-0 top-12 bg-white rounded-xl shadow-xl border border-border p-4 w-56 z-20"
                  >
                    <div className="text-[#272936] mb-3" style={{ fontSize: 13, fontWeight: 700 }}>Filter by Status</div>
                    {(["All", "Active", "Suspended", "Pending"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setShowFilterPanel(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center justify-between ${
                          statusFilter === s ? "bg-[#0159C7] text-white" : "text-[#6B7280] hover:bg-[#F5F7FB]"
                        }`}
                        style={{ fontSize: 13, fontWeight: 500 }}
                      >
                        {s}
                        {statusFilter === s && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                    {statusFilter !== "All" && (
                      <button
                        onClick={() => { setStatusFilter("All"); setShowFilterPanel(false); }}
                        className="w-full mt-2 pt-2 border-t border-border text-[#EF4444] text-center"
                        style={{ fontSize: 13, fontWeight: 500 }}
                      >
                        Clear Filter
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-border">
          {paginated.length === 0 && (
            <div className="text-center py-16">
              <div className="text-[#6B7280]" style={{ fontSize: 14 }}>
                {search || statusFilter !== "All" ? "No users match your search or filter criteria." : "No users yet."}
              </div>
              {(search || statusFilter !== "All") && (
                <button onClick={() => { setSearch(""); setStatusFilter("All"); }} className="text-[#0159C7] mt-2" style={{ fontSize: 13, fontWeight: 600 }}>Clear all filters</button>
              )}
            </div>
          )}
          {paginated.map((u) => (
            <div key={u.id} className={`p-4 transition-colors ${selectedIds.has(u.id) ? "bg-[#EEF2FF]" : ""}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} className="w-4 h-4 rounded border-[#D1D5DB] text-[#0159C7] accent-[#0159C7] mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <button onClick={() => setProfileUser(u)} className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 bg-[#0159C7]/10 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-[#0159C7]" style={{ fontSize: 13, fontWeight: 600 }}>{u.name[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[#272936] truncate" style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</div>
                        <div className="text-[#6B7280] truncate" style={{ fontSize: 12 }}>{u.email}</div>
                      </div>
                    </button>
                    <span className={`inline-flex px-2.5 py-1 rounded-full shrink-0 ${u.status === "Active" ? "bg-[#22C55E]/10 text-[#22C55E]" : u.status === "Suspended" ? "bg-[#EF4444]/10 text-[#EF4444]" : "bg-[#F59E0B]/10 text-[#F59E0B]"}`} style={{ fontSize: 12, fontWeight: 600 }}>{u.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="bg-[#F5F7FB] rounded-lg px-2.5 py-1.5 text-center">
                      <div className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>{u.trades}</div>
                      <div className="text-[#9CA3AF]" style={{ fontSize: 10 }}>Trades</div>
                    </div>
                    <div className="bg-[#F5F7FB] rounded-lg px-2.5 py-1.5 text-center">
                      <div className="text-[#0159C7]" style={{ fontSize: 13, fontWeight: 600 }}>{u.balance}</div>
                      <div className="text-[#9CA3AF]" style={{ fontSize: 10 }}>Balance</div>
                    </div>
                    <div className="bg-[#F5F7FB] rounded-lg px-2.5 py-1.5 text-center">
                      <div className="text-[#6B7280]" style={{ fontSize: 12 }}>{u.joined}</div>
                      <div className="text-[#9CA3AF]" style={{ fontSize: 10 }}>Joined</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setProfileUser(u)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#F5F7FB] text-[#6B7280] rounded-lg hover:bg-[#E8EBF0] transition-colors" style={{ fontSize: 12, fontWeight: 500 }}><Eye className="w-3.5 h-3.5" /> View</button>
                    <button onClick={() => setEmailUser(u)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#F5F7FB] text-[#6B7280] rounded-lg hover:bg-[#E8EBF0] transition-colors" style={{ fontSize: 12, fontWeight: 500 }}><Mail className="w-3.5 h-3.5" /> Email</button>
                    {hasPermission("users.suspend") && (
                      u.status !== "Suspended" ? (
                        <button onClick={() => setConfirmModal({ title: `Suspend ${u.name}?`, message: "This user will lose access to their account.", confirmLabel: "Suspend", confirmColor: "#EF4444", onConfirm: () => { suspendUser(u.id); setConfirmModal(null); } })} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#EF4444]/5 text-[#EF4444] rounded-lg hover:bg-[#EF4444]/10 transition-colors" style={{ fontSize: 12, fontWeight: 500 }}><Ban className="w-3.5 h-3.5" /> Suspend</button>
                      ) : (
                        <button onClick={() => activateUser(u.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#22C55E]/5 text-[#22C55E] rounded-lg hover:bg-[#22C55E]/10 transition-colors" style={{ fontSize: 12, fontWeight: 500 }}><CheckCircle className="w-3.5 h-3.5" /> Activate</button>
                      )
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
                <th className="px-6 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-[#D1D5DB] text-[#0159C7] focus:ring-[#0159C7] cursor-pointer accent-[#0159C7]"
                  />
                </th>
                {([
                  { key: "name" as SortKey, label: "USER" },
                  { key: null, label: "PHONE" },
                  { key: "trades" as SortKey, label: "TRADES" },
                  { key: "balanceNum" as SortKey, label: "BALANCE" },
                  { key: "status" as SortKey, label: "STATUS" },
                  { key: "joined" as SortKey, label: "JOINED" },
                  { key: null, label: "ACTIONS" },
                ] as const).map((col) => (
                  <th
                    key={col.label}
                    className={`text-left px-6 py-3 text-[#6B7280] ${col.key ? "cursor-pointer hover:text-[#272936] select-none" : ""}`}
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
              {isLoading && (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="text-[#6B7280]" style={{ fontSize: 14 }}>Loading users…</div>
                  </td>
                </tr>
              )}
              {!isLoading && paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="text-[#6B7280]" style={{ fontSize: 14 }}>
                      {search || statusFilter !== "All" ? "No users match your search or filter criteria." : "No users yet."}
                    </div>
                    {(search || statusFilter !== "All") && (
                      <button
                        onClick={() => { setSearch(""); setStatusFilter("All"); }}
                        className="text-[#0159C7] mt-2"
                        style={{ fontSize: 13, fontWeight: 600 }}
                      >
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {paginated.map((u) => (
                <tr
                  key={u.id}
                  className={`border-t border-border transition-colors ${
                    selectedIds.has(u.id) ? "bg-[#EEF2FF]" : "hover:bg-[#F5F7FB]/50"
                  }`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                      className="w-4 h-4 rounded border-[#D1D5DB] text-[#0159C7] focus:ring-[#0159C7] cursor-pointer accent-[#0159C7]"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <button
                      className="flex items-center gap-3 text-left group"
                      onClick={() => setProfileUser(u)}
                    >
                      <div className="w-9 h-9 bg-[#0159C7]/10 rounded-full flex items-center justify-center shrink-0 group-hover:bg-[#0159C7] transition-colors">
                        <span className="text-[#0159C7] group-hover:text-white transition-colors" style={{ fontSize: 13, fontWeight: 600 }}>{u.name[0]}</span>
                      </div>
                      <div>
                        <div className="text-[#272936] group-hover:text-[#0159C7] transition-colors" style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</div>
                        <div className="text-[#6B7280]" style={{ fontSize: 12 }}>{u.email}</div>
                      </div>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-[#272936]" style={{ fontSize: 13 }}>{u.phone}</td>
                  <td className="px-6 py-4 text-[#272936]" style={{ fontSize: 13, fontWeight: 500 }}>{u.trades}</td>
                  <td className="px-6 py-4 text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>{u.balance}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full ${
                        u.status === "Active" ? "bg-[#22C55E]/10 text-[#22C55E]" :
                        u.status === "Suspended" ? "bg-[#EF4444]/10 text-[#EF4444]" :
                        "bg-[#F59E0B]/10 text-[#F59E0B]"
                      }`}
                      style={{ fontSize: 12, fontWeight: 600 }}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#6B7280]" style={{ fontSize: 13 }}>{u.joined}</td>
                  <td className="px-6 py-4">
                    <div className="relative" ref={actionMenu === u.id ? actionMenuRef : undefined}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === u.id ? null : u.id); }}
                        className="p-1.5 hover:bg-[#F5F7FB] rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-[#6B7280]" />
                      </button>
                      <AnimatePresence>
                        {actionMenu === u.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-border py-1.5 w-48 z-20"
                          >
                            <button
                              onClick={() => { setProfileUser(u); setActionMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#272936] hover:bg-[#F5F7FB] transition-colors"
                              style={{ fontSize: 13 }}
                            >
                              <Eye className="w-4 h-4 text-[#6B7280]" /> View Profile
                            </button>
                            <button
                              onClick={() => { setEmailUser(u); setActionMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#272936] hover:bg-[#F5F7FB] transition-colors"
                              style={{ fontSize: 13 }}
                            >
                              <Mail className="w-4 h-4 text-[#6B7280]" /> Email User
                            </button>
                            {(hasPermission("users.suspend") || hasPermission("users.delete")) && (
                              <div className="mx-3 my-1 border-t border-border" />
                            )}
                            {hasPermission("users.suspend") && (
                              u.status !== "Suspended" ? (
                                <button
                                  onClick={() =>
                                    setConfirmModal({
                                      title: `Suspend ${u.name}?`,
                                      message: "This user will lose access to their account and all pending transactions will be frozen.",
                                      confirmLabel: "Suspend User",
                                      confirmColor: "#EF4444",
                                      onConfirm: () => { suspendUser(u.id); setConfirmModal(null); },
                                    })
                                  }
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#F59E0B] hover:bg-[#F59E0B]/5 transition-colors"
                                  style={{ fontSize: 13 }}
                                >
                                  <Ban className="w-4 h-4" /> Suspend
                                </button>
                              ) : (
                                <button
                                  onClick={() => { activateUser(u.id); }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#22C55E] hover:bg-[#22C55E]/5 transition-colors"
                                  style={{ fontSize: 13 }}
                                >
                                  <CheckCircle className="w-4 h-4" /> Reactivate
                                </button>
                              )
                            )}
                            {hasPermission("users.delete") && (
                              <button
                                onClick={() =>
                                  setConfirmModal({
                                    title: `Delete ${u.name}?`,
                                    message: "This action is permanent and cannot be undone. All user data, transactions, and wallet balance will be lost.",
                                    confirmLabel: "Delete User",
                                    confirmColor: "#EF4444",
                                    onConfirm: () => deleteUser(u.id),
                                  })
                                }
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#EF4444] hover:bg-[#EF4444]/5 transition-colors"
                                style={{ fontSize: 13 }}
                              >
                                <Trash2 className="w-4 h-4" /> Delete User
                              </button>
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
        </div>{/* end hidden lg:block */}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[#6B7280]" style={{ fontSize: 13 }}>
            Showing {Math.min((safePage - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} users
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={safePage === 1}
              className="px-3 py-1.5 rounded-lg text-[#6B7280] hover:bg-[#F5F7FB] disabled:opacity-30"
              style={{ fontSize: 13 }}
            >
              First
            </button>
            <button
              onClick={() => setPage(safePage - 1)}
              disabled={safePage === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F5F7FB] disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  p === safePage ? "bg-[#0159C7] text-white" : "text-[#6B7280] hover:bg-[#F5F7FB]"
                }`}
                style={{ fontSize: 13, fontWeight: p === safePage ? 600 : 400 }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(safePage + 1)}
              disabled={safePage === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F5F7FB] disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={safePage === totalPages}
              className="px-3 py-1.5 rounded-lg text-[#6B7280] hover:bg-[#F5F7FB] disabled:opacity-30"
              style={{ fontSize: 13 }}
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {profileUser && (
          <UserProfileDrawer
            key="profile"
            user={profileUser}
            onClose={() => setProfileUser(null)}
            onSuspend={() =>
              setConfirmModal({
                title: `Suspend ${profileUser.name}?`,
                message: "This user will lose access to their account.",
                confirmLabel: "Suspend User",
                confirmColor: "#EF4444",
                onConfirm: () => { suspendUser(profileUser.id); setConfirmModal(null); },
              })
            }
            onActivate={() => activateUser(profileUser.id)}
            onDelete={() =>
              setConfirmModal({
                title: `Delete ${profileUser.name}?`,
                message: "This action is permanent and cannot be undone.",
                confirmLabel: "Delete User",
                confirmColor: "#EF4444",
                onConfirm: () => deleteUser(profileUser.id),
              })
            }
            onEmail={() => { setEmailUser(profileUser); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {emailUser && (
          <EmailModal
            key="email"
            user={emailUser}
            onClose={() => setEmailUser(null)}
            onSend={(subject) => {
              toast.success(`Email "${subject}" sent to ${emailUser.name}`);
              setEmailUser(null);
            }}
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
