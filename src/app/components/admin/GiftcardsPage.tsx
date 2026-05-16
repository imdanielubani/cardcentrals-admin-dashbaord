import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search, Filter, Check, X, AlertTriangle, Eye, ImageIcon,
  ChevronLeft, ChevronRight, Download, ArrowUpDown, Clock,
  CreditCard, Copy, User, Banknote, Flag, FlagOff, Shield,
  CheckCircle, XCircle, MoreVertical, RefreshCw, Calendar,
  ChevronDown, Trash2, MessageSquare, Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { api } from "../../../lib/api";
import type { GiftCardTransaction as BackendGiftCard, PaginatedResponse } from "../../../types";

// ── Types ──
type Status = "Pending" | "Approved" | "Rejected" | "Flagged";

interface ActivityItem {
  action: string;
  by: string;
  time: string;
  note?: string;
}

interface Submission {
  id: string;
  user: string;
  userEmail: string;
  brand: string;
  brandLogoUrl: string | null;
  country: string;
  value: string;
  valueNum: number;
  rate: string;
  rateNum: number;
  payout: string;
  payoutNum: number;
  status: Status;
  time: string;
  submittedAt: string;
  hasImage: boolean;
  imageUrl: string | null;
  eCode: string;
  cardType: "Physical" | "E-Code";
  activity: ActivityItem[];
  rejectionReason?: string;
  adminNote?: string;
}

type SortKey = "id" | "user" | "brand" | "valueNum" | "payoutNum" | "status" | "time";
type SortDir = "asc" | "desc";

const statusColors: Record<Status, string> = {
  Pending: "bg-[#F59E0B]/10 text-[#F59E0B]",
  Approved: "bg-[#22C55E]/10 text-[#22C55E]",
  Rejected: "bg-[#EF4444]/10 text-[#EF4444]",
  Flagged: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
};

const rejectionReasons: string[] = [
  "Invalid or used gift card code",
  "Card image is unclear or incomplete",
  "Card region does not match selected country",
  "Card already redeemed",
  "Suspicious or duplicate submission",
  "Other",
];

// ── Subcomponents ──

function BrandLogo({ name, logoUrl, size = 28 }: { name: string; logoUrl: string | null; size?: number }) {
  const [errored, setErrored] = useState(false);
  const tone =
    name === "iTunes" ? { bg: "bg-[#EA4CC0]/10", fg: "text-[#EA4CC0]" } :
    name === "Amazon" ? { bg: "bg-[#FF9900]/10", fg: "text-[#FF9900]" } :
    name === "Steam" ? { bg: "bg-[#1B2838]/10", fg: "text-[#1B2838]" } :
    name === "Google Play" ? { bg: "bg-[#34A853]/10", fg: "text-[#34A853]" } :
    { bg: "bg-[#0159C7]/10", fg: "text-[#0159C7]" };

  const showImage = !!logoUrl && !errored;
  return (
    <div
      className={`rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${showImage ? "bg-white border border-border" : tone.bg}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={logoUrl!}
          alt={`${name} logo`}
          className="w-full h-full object-contain"
          onError={() => setErrored(true)}
        />
      ) : (
        <CreditCard className={`w-3.5 h-3.5 ${tone.fg}`} />
      )}
    </div>
  );
}

function ImageViewerModal({ imageUrl, onClose }: { imageUrl: string | null; onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hasRealImage = !!imageUrl && !imgError;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-[#272936]" style={{ fontSize: 16, fontWeight: 700 }}>Gift Card Image</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F5F7FB] flex items-center justify-center"><X className="w-5 h-5 text-[#6B7280]" /></button>
        </div>
        <div className="p-6 flex flex-col items-center">
          {hasRealImage ? (
            <>
              {!loaded && (
                <div className="w-full aspect-video bg-[#F5F7FB] rounded-xl flex items-center justify-center mb-4 animate-pulse">
                  <CreditCard className="w-12 h-12 text-[#D1D5DB]" />
                </div>
              )}
              <img
                src={imageUrl!}
                alt="Gift card submitted by user"
                className={`w-full rounded-xl object-contain mb-4 max-h-80 ${loaded ? "block" : "hidden"}`}
                onLoad={() => setLoaded(true)}
                onError={() => setImgError(true)}
              />
            </>
          ) : (
            <div className="w-full aspect-video bg-gradient-to-br from-[#EA4CC0] via-[#8B5CF6] to-[#0159C7] rounded-xl flex items-center justify-center mb-4">
              <div className="text-center text-white">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-80" />
                <div style={{ fontSize: 18, fontWeight: 700 }}>Gift Card</div>
                <div className="opacity-60" style={{ fontSize: 13 }}>Image not available</div>
              </div>
            </div>
          )}
          <p className="text-[#6B7280] text-center" style={{ fontSize: 12 }}>
            {hasRealImage ? "Image uploaded by user" : "No image was uploaded for this submission"}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function SubmissionDrawer({
  submission: s,
  onClose,
  onApprove,
  onReject,
  onFlag,
  onUnflag,
  onViewImage,
}: {
  submission: Submission;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onFlag?: () => void;
  onUnflag?: () => void;
  onViewImage: () => void;
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
          <h2 className="text-[#272936]" style={{ fontSize: 18, fontWeight: 700 }}>Submission Detail</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F5F7FB] flex items-center justify-center"><X className="w-5 h-5 text-[#6B7280]" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & ID */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[#6B7280]" style={{ fontSize: 13 }}>ID:</span>
              <span className="text-[#272936]" style={{ fontSize: 14, fontWeight: 700 }}>{s.id}</span>
              <button onClick={() => { navigator.clipboard.writeText(s.id); toast.success("ID copied!"); }}>
                <Copy className="w-3.5 h-3.5 text-[#9CA3AF] hover:text-[#0159C7]" />
              </button>
            </div>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${statusColors[s.status]}`} style={{ fontSize: 12, fontWeight: 600 }}>
              {s.status === "Flagged" && <AlertTriangle className="w-3 h-3" />}
              {s.status === "Approved" && <CheckCircle className="w-3 h-3" />}
              {s.status === "Rejected" && <XCircle className="w-3 h-3" />}
              {s.status === "Pending" && <Clock className="w-3 h-3" />}
              {s.status}
            </span>
          </div>

          {/* Card preview */}
          <div
            className="rounded-2xl p-5 cursor-pointer"
            style={{
              background: s.brand === "iTunes" ? "linear-gradient(135deg, #EA4CC0, #B83490)" :
                s.brand === "Amazon" ? "linear-gradient(135deg, #FF9900, #CC7A00)" :
                s.brand === "Steam" ? "linear-gradient(135deg, #1B2838, #2A475E)" :
                s.brand === "Google Play" ? "linear-gradient(135deg, #34A853, #1E7E34)" :
                s.brand === "Vanilla" ? "linear-gradient(135deg, #F59E0B, #D97706)" :
                "linear-gradient(135deg, #0159C7, #126CF8)",
            }}
            onClick={s.hasImage ? onViewImage : undefined}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden">
                {s.brandLogoUrl ? (
                  <img src={s.brandLogoUrl} alt={`${s.brand} logo`} className="w-full h-full object-contain" />
                ) : (
                  <CreditCard className="w-5 h-5 text-[#0159C7]" />
                )}
              </div>
              <div>
                <div className="text-white" style={{ fontSize: 18, fontWeight: 700 }}>{s.brand}</div>
                <div className="text-white/70" style={{ fontSize: 13 }}>{s.country} · {s.cardType}</div>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-white/60" style={{ fontSize: 12 }}>Value</div>
                <div className="text-white" style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</div>
              </div>
              {s.hasImage && (
                <div className="flex items-center gap-1 bg-white/20 rounded-lg px-2.5 py-1">
                  <ImageIcon className="w-3.5 h-3.5 text-white" />
                  <span className="text-white" style={{ fontSize: 11, fontWeight: 500 }}>View Image</span>
                </div>
              )}
            </div>
          </div>

          {/* User Info */}
          <div>
            <h4 className="text-[#6B7280] mb-2" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>SUBMITTED BY</h4>
            <div className="bg-[#F5F7FB] rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0159C7] rounded-full flex items-center justify-center shrink-0">
                <span className="text-white" style={{ fontSize: 14, fontWeight: 700 }}>{s.user[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[#272936] truncate" style={{ fontSize: 14, fontWeight: 600 }}>{s.user}</div>
                <div className="text-[#6B7280]" style={{ fontSize: 12 }}>{s.userEmail}</div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div>
            <h4 className="text-[#6B7280] mb-2" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>CARD DETAILS</h4>
            <div className="bg-[#F5F7FB] rounded-xl p-4 space-y-3">
              {[
                { label: "Brand", value: s.brand },
                { label: "Country", value: s.country },
                { label: "Card Type", value: s.cardType },
                { label: "Card Value", value: s.value },
                { label: "Rate", value: s.rate },
              ].map((r) => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-[#6B7280]" style={{ fontSize: 13 }}>{r.label}</span>
                  <span className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
              <div className="border-t border-[#E8EBF0] pt-3 flex justify-between">
                <span className="text-[#272936]" style={{ fontSize: 14, fontWeight: 600 }}>Payout</span>
                <span className="text-[#0159C7]" style={{ fontSize: 20, fontWeight: 700 }}>{s.payout}</span>
              </div>
            </div>
          </div>

          {/* E-Code */}
          <div>
            <h4 className="text-[#6B7280] mb-2" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>E-CODE</h4>
            <div className="bg-[#F5F7FB] rounded-xl px-4 py-3 flex items-center justify-between gap-2">
              <span className="text-[#272936] tracking-widest truncate min-w-0" style={{ fontSize: 15, fontWeight: 600 }}>{s.eCode}</span>
              <button onClick={() => { navigator.clipboard.writeText(s.eCode); toast.success("E-code copied!"); }} className="text-[#0159C7]">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Rejection Reason */}
          {s.rejectionReason && (
            <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-[#EF4444]" />
                <span className="text-[#EF4444]" style={{ fontSize: 13, fontWeight: 600 }}>Rejection Reason</span>
              </div>
              <p className="text-[#6B7280]" style={{ fontSize: 13 }}>{s.rejectionReason}</p>
            </div>
          )}

          {/* Admin Note */}
          {s.adminNote && (
            <div className="bg-[#0159C7]/5 border border-[#0159C7]/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-[#0159C7]" />
                <span className="text-[#0159C7]" style={{ fontSize: 13, fontWeight: 600 }}>Admin Note</span>
              </div>
              <p className="text-[#6B7280]" style={{ fontSize: 13 }}>{s.adminNote}</p>
            </div>
          )}

          {/* Activity timeline */}
          <div>
            <h4 className="text-[#6B7280] mb-3" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>ACTIVITY TIMELINE</h4>
            <div className="space-y-0">
              {s.activity.map((a, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                      a.action === "Approved" ? "bg-[#22C55E]" :
                      a.action === "Rejected" ? "bg-[#EF4444]" :
                      a.action === "Flagged" ? "bg-[#F59E0B]" :
                      a.action === "Unflagged" ? "bg-[#0159C7]" :
                      "bg-[#D1D5DB]"
                    }`} />
                    {i < s.activity.length - 1 && <div className="w-px flex-1 bg-[#E8EBF0] my-1" />}
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
            {s.status === "Pending" && (onApprove || onReject || onFlag) && (
              <>
                {onApprove && (
                  <button onClick={onApprove} className="w-full flex items-center justify-center gap-2 py-3 bg-[#22C55E] text-white rounded-xl hover:bg-[#16A34A] transition-colors" style={{ fontSize: 14, fontWeight: 600 }}>
                    <Check className="w-4 h-4" /> Approve Submission
                  </button>
                )}
                {onReject && (
                  <button onClick={onReject} className="w-full flex items-center justify-center gap-2 py-3 bg-[#EF4444] text-white rounded-xl hover:bg-[#DC2626] transition-colors" style={{ fontSize: 14, fontWeight: 600 }}>
                    <X className="w-4 h-4" /> Reject Submission
                  </button>
                )}
                {onFlag && (
                  <button onClick={onFlag} className="w-full flex items-center justify-center gap-2 py-3 border border-[#F59E0B] text-[#F59E0B] rounded-xl hover:bg-[#F59E0B]/5 transition-colors" style={{ fontSize: 14, fontWeight: 600 }}>
                    <Flag className="w-4 h-4" /> Flag for Review
                  </button>
                )}
              </>
            )}
            {s.status === "Flagged" && (onApprove || onReject || onUnflag) && (
              <>
                {onApprove && (
                  <button onClick={onApprove} className="w-full flex items-center justify-center gap-2 py-3 bg-[#22C55E] text-white rounded-xl hover:bg-[#16A34A] transition-colors" style={{ fontSize: 14, fontWeight: 600 }}>
                    <Check className="w-4 h-4" /> Approve Submission
                  </button>
                )}
                {onReject && (
                  <button onClick={onReject} className="w-full flex items-center justify-center gap-2 py-3 bg-[#EF4444] text-white rounded-xl hover:bg-[#DC2626] transition-colors" style={{ fontSize: 14, fontWeight: 600 }}>
                    <X className="w-4 h-4" /> Reject Submission
                  </button>
                )}
                {onUnflag && (
                  <button onClick={onUnflag} className="w-full flex items-center justify-center gap-2 py-3 border border-[#0159C7] text-[#0159C7] rounded-xl hover:bg-[#0159C7]/5 transition-colors" style={{ fontSize: 14, fontWeight: 600 }}>
                    <FlagOff className="w-4 h-4" /> Remove Flag
                  </button>
                )}
              </>
            )}
            {!(onApprove || onReject || onFlag || onUnflag) && (s.status === "Pending" || s.status === "Flagged") && (
              <div className="bg-[#F5F7FB] rounded-xl p-4 text-center">
                <Lock className="w-5 h-5 text-[#9CA3AF] mx-auto mb-2" />
                <p className="text-[#6B7280]" style={{ fontSize: 13 }}>You don't have permission to take actions on this submission.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ApproveModal({
  submission,
  onClose,
  onConfirm,
}: {
  submission: Submission;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setLoading(true);
    setTimeout(() => {
      onConfirm(note);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-[#272936]" style={{ fontSize: 18, fontWeight: 700 }}>Approve Submission</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F5F7FB] flex items-center justify-center"><X className="w-5 h-5 text-[#6B7280]" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-[#22C55E]/10 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-[#22C55E]" />
            <div>
              <div className="text-[#272936]" style={{ fontSize: 14, fontWeight: 600 }}>Approve {submission.brand} {submission.value}</div>
              <div className="text-[#6B7280]" style={{ fontSize: 13 }}>{submission.payout} will be credited to {submission.user}'s wallet</div>
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
            {loading ? "Processing..." : "Confirm Approve"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function RejectModal({
  submission,
  onClose,
  onConfirm,
}: {
  submission: Submission;
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
    setTimeout(() => {
      onConfirm(finalReason, note);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-[#272936]" style={{ fontSize: 18, fontWeight: 700 }}>Reject Submission</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F5F7FB] flex items-center justify-center"><X className="w-5 h-5 text-[#6B7280]" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-[#EF4444]/10 rounded-xl p-4 flex items-center gap-3">
            <XCircle className="w-6 h-6 text-[#EF4444]" />
            <div>
              <div className="text-[#272936]" style={{ fontSize: 14, fontWeight: 600 }}>Reject {submission.brand} {submission.value}</div>
              <div className="text-[#6B7280]" style={{ fontSize: 13 }}>Submitted by {submission.user}</div>
            </div>
          </div>
          <div>
            <label className="block text-[#272936] mb-2" style={{ fontSize: 13, fontWeight: 600 }}>Select Reason *</label>
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
  brandFilter, setBrandFilter,
  countryFilter, setCountryFilter,
  cardTypeFilter, setCardTypeFilter,
  brandOptions, countryOptions,
  onClear, onClose,
}: {
  brandFilter: string; setBrandFilter: (v: string) => void;
  countryFilter: string; setCountryFilter: (v: string) => void;
  cardTypeFilter: string; setCardTypeFilter: (v: string) => void;
  brandOptions: string[]; countryOptions: string[];
  onClear: () => void; onClose: () => void;
}) {
  const activeCount = [brandFilter, countryFilter, cardTypeFilter].filter(Boolean).length;
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute right-0 sm:right-0 left-0 sm:left-auto top-12 bg-white rounded-xl shadow-xl border border-border p-5 sm:w-72 z-20">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[#272936]" style={{ fontSize: 14, fontWeight: 700 }}>Filters</span>
        {activeCount > 0 && (
          <button onClick={onClear} className="text-[#EF4444]" style={{ fontSize: 12, fontWeight: 600 }}>Clear all</button>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-[#6B7280] mb-1.5" style={{ fontSize: 12, fontWeight: 600 }}>BRAND</label>
          <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="w-full bg-[#F5F7FB] rounded-lg px-3 py-2 outline-none border border-border focus:border-[#0159C7]" style={{ fontSize: 13 }}>
            <option value="">All Brands</option>
            {brandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[#6B7280] mb-1.5" style={{ fontSize: 12, fontWeight: 600 }}>COUNTRY</label>
          <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="w-full bg-[#F5F7FB] rounded-lg px-3 py-2 outline-none border border-border focus:border-[#0159C7]" style={{ fontSize: 13 }}>
            <option value="">All Countries</option>
            {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[#6B7280] mb-1.5" style={{ fontSize: 12, fontWeight: 600 }}>CARD TYPE</label>
          <select value={cardTypeFilter} onChange={(e) => setCardTypeFilter(e.target.value)} className="w-full bg-[#F5F7FB] rounded-lg px-3 py-2 outline-none border border-border focus:border-[#0159C7]" style={{ fontSize: 13 }}>
            <option value="">All Types</option>
            <option value="Physical">Physical</option>
            <option value="E-Code">E-Code</option>
          </select>
        </div>
      </div>
      <button onClick={onClose} className="w-full mt-4 py-2 bg-[#0159C7] text-white rounded-lg" style={{ fontSize: 13, fontWeight: 600 }}>Apply Filters</button>
    </motion.div>
  );
}

// ── Main ──
const ITEMS_PER_PAGE = 6;

export function GiftcardsPage() {
  const { hasPermission } = useAdminAuth();
  const canApprove = hasPermission("giftcards.approve");
  const canReject = hasPermission("giftcards.reject");
  const canFlag = hasPermission("giftcards.flag");
  const canExport = hasPermission("giftcards.export");
  const canTakeAction = canApprove || canReject || canFlag;

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"All" | Status>("All");
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Advanced filters
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [brandFilter, setBrandFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [cardTypeFilter, setCardTypeFilter] = useState("");

  // Modals
  const [drawerSubmission, setDrawerSubmission] = useState<Submission | null>(null);
  const [approveTarget, setApproveTarget] = useState<Submission | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Submission | null>(null);
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; confirmLabel: string; confirmColor: string; onConfirm: () => void } | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

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

  // Fetch gift card submissions from backend
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    api.get<PaginatedResponse<BackendGiftCard>>("/admin/gift-cards?limit=100&page=1")
      .then((res) => {
        if (cancelled) return;
        const statusMap: Record<string, Status> = {
          pending: "Pending", processing: "Pending",
          completed: "Approved", rejected: "Rejected", flagged: "Flagged",
        };
        const mapped: Submission[] = res.data.map((g) => ({
          id: g.id,
          user: g.user.fullName,
          userEmail: g.user.email,
          brand: g.brandName,
          brandLogoUrl: g.brand?.logoUrl ?? null,
          country: g.countryCode,
          value: `$${g.amount}`,
          valueNum: g.amount,
          rate: `₦${g.rate}/$`,
          rateNum: g.rate,
          payout: `₦${g.payout.toLocaleString()}`,
          payoutNum: g.payout,
          status: statusMap[g.status] ?? "Pending",
          time: new Date(g.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          submittedAt: new Date(g.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          hasImage: !!g.imageUrl,
          imageUrl: g.imageUrl,
          eCode: g.eCode ?? "",
          cardType: g.cardType === "ecode" ? "E-Code" : "Physical",
          activity: [],
          rejectionReason: undefined,
          adminNote: g.adminNote ?? undefined,
        }));
        setSubmissions(mapped);
      })
      .catch(() => toast.error("Failed to load gift card submissions"))
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const tabs: ("All" | Status)[] = ["All", "Pending", "Approved", "Rejected", "Flagged"];
  const advFilterCount = [brandFilter, countryFilter, cardTypeFilter].filter(Boolean).length;

  // ── Filter / Sort / Page ──
  const filtered = useMemo(() => {
    let list = submissions.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.user.toLowerCase().includes(q) || s.brand.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.eCode.toLowerCase().includes(q) || s.country.toLowerCase().includes(q);
      const matchTab = tab === "All" || s.status === tab;
      const matchBrand = !brandFilter || s.brand === brandFilter;
      const matchCountry = !countryFilter || s.country === countryFilter;
      const matchType = !cardTypeFilter || s.cardType === cardTypeFilter;
      return matchSearch && matchTab && matchBrand && matchCountry && matchType;
    });

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "id": cmp = a.id.localeCompare(b.id); break;
        case "user": cmp = a.user.localeCompare(b.user); break;
        case "brand": cmp = a.brand.localeCompare(b.brand); break;
        case "valueNum": cmp = a.valueNum - b.valueNum; break;
        case "payoutNum": cmp = a.payoutNum - b.payoutNum; break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "time": cmp = a.id.localeCompare(b.id); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [submissions, search, tab, brandFilter, countryFilter, cardTypeFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, tab, brandFilter, countryFilter, cardTypeFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Selection ──
  const allOnPageSelected = paginated.length > 0 && paginated.every((s) => selectedIds.has(s.id));
  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      const n = new Set(selectedIds);
      paginated.forEach((s) => n.delete(s.id));
      setSelectedIds(n);
    } else {
      const n = new Set(selectedIds);
      paginated.forEach((s) => n.add(s.id));
      setSelectedIds(n);
    }
  };
  const toggleSelect = (id: string) => {
    const n = new Set(selectedIds);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelectedIds(n);
  };

  // ── Actions ──
  const approveSubmission = useCallback((id: string, note: string) => {
    api.patch(`/admin/gift-cards/${id}/status`, { status: "completed", adminNote: note || undefined })
      .then(() => {
        setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status: "Approved" as Status, adminNote: note || undefined, activity: [...s.activity, { action: "Approved", by: "Admin", time: "Just now", note: note || "Card verified and approved" }] } : s));
        setDrawerSubmission((prev) => prev?.id === id ? { ...prev, status: "Approved" as Status, adminNote: note || undefined, activity: [...prev.activity, { action: "Approved", by: "Admin", time: "Just now", note: note || "Card verified and approved" }] } : prev);
        toast.success("Submission approved — payout credited to user wallet");
      })
      .catch(() => toast.error("Failed to approve submission"))
      .finally(() => setApproveTarget(null));
  }, []);

  const rejectSubmission = useCallback((id: string, reason: string, note: string) => {
    api.patch(`/admin/gift-cards/${id}/status`, { status: "rejected", adminNote: note || reason })
      .then(() => {
        setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status: "Rejected" as Status, rejectionReason: reason, adminNote: note || undefined, activity: [...s.activity, { action: "Rejected", by: "Admin", time: "Just now", note: reason }] } : s));
        setDrawerSubmission((prev) => prev?.id === id ? { ...prev, status: "Rejected" as Status, rejectionReason: reason, adminNote: note || undefined, activity: [...prev.activity, { action: "Rejected", by: "Admin", time: "Just now", note: reason }] } : prev);
        toast.success("Submission rejected — user has been notified");
      })
      .catch(() => toast.error("Failed to reject submission"))
      .finally(() => setRejectTarget(null));
  }, []);

  const flagSubmission = useCallback((id: string) => {
    api.patch(`/admin/gift-cards/${id}/status`, { status: "flagged" })
      .then(() => {
        setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status: "Flagged" as Status, activity: [...s.activity, { action: "Flagged", by: "Admin", time: "Just now", note: "Flagged for manual review" }] } : s));
        setDrawerSubmission((prev) => prev?.id === id ? { ...prev, status: "Flagged" as Status, activity: [...prev.activity, { action: "Flagged", by: "Admin", time: "Just now", note: "Flagged for manual review" }] } : prev);
        toast.warning("Submission flagged for review");
      })
      .catch(() => toast.error("Failed to flag submission"));
  }, []);

  const unflagSubmission = useCallback((id: string) => {
    // Backend DTO accepts processing/completed/rejected/flagged — sending
    // "pending" is rejected by zod. "processing" is the canonical
    // post-unflag state and triggers the txn_unflagged audit action.
    api.patch(`/admin/gift-cards/${id}/status`, { status: "processing" })
      .then(() => {
        setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status: "Pending" as Status, activity: [...s.activity, { action: "Unflagged", by: "Admin", time: "Just now", note: "Flag removed — returned to pending review" }] } : s));
        setDrawerSubmission((prev) => prev?.id === id ? { ...prev, status: "Pending" as Status, activity: [...prev.activity, { action: "Unflagged", by: "Admin", time: "Just now", note: "Flag removed — returned to pending review" }] } : prev);
        toast.success("Flag removed — submission returned to Pending");
      })
      .catch(() => toast.error("Failed to unflag submission"));
  }, []);

  const bulkApprove = useCallback(async () => {
    const targetIds = [...selectedIds].filter((id) => {
      const s = submissions.find((x) => x.id === id);
      return s && (s.status === "Pending" || s.status === "Flagged");
    });
    const results = await Promise.allSettled(
      targetIds.map((id) => api.patch(`/admin/gift-cards/${id}/status`, { status: "completed" }))
    );
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    setSubmissions((prev) => prev.map((s) =>
      targetIds.includes(s.id)
        ? { ...s, status: "Approved" as Status, activity: [...s.activity, { action: "Approved", by: "Admin (Bulk)", time: "Just now" }] }
        : s
    ));
    toast.success(`${succeeded}/${targetIds.length} submission(s) approved`);
    setSelectedIds(new Set());
    setConfirmModal(null);
  }, [selectedIds, submissions]);

  const bulkReject = useCallback(async () => {
    const targetIds = [...selectedIds].filter((id) => {
      const s = submissions.find((x) => x.id === id);
      return s && (s.status === "Pending" || s.status === "Flagged");
    });
    const results = await Promise.allSettled(
      targetIds.map((id) => api.patch(`/admin/gift-cards/${id}/status`, { status: "rejected", adminNote: "Bulk rejection" }))
    );
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    setSubmissions((prev) => prev.map((s) =>
      targetIds.includes(s.id)
        ? { ...s, status: "Rejected" as Status, rejectionReason: "Bulk rejection", activity: [...s.activity, { action: "Rejected", by: "Admin (Bulk)", time: "Just now", note: "Bulk rejection" }] }
        : s
    ));
    toast.success(`${succeeded}/${targetIds.length} submission(s) rejected`);
    setSelectedIds(new Set());
    setConfirmModal(null);
  }, [selectedIds, submissions]);

  const exportCSV = () => {
    const header = "ID,User,Email,Brand,Country,Type,Value,Rate,Payout,Status,E-Code,Submitted\n";
    const rows = filtered.map((s) => `"${s.id}","${s.user}","${s.userEmail}","${s.brand}","${s.country}","${s.cardType}","${s.value}","${s.rate}","${s.payout}","${s.status}","${s.eCode}","${s.submittedAt}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cardcentrals-giftcards.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Submissions exported to CSV");
  };

  // ── Stats ──
  const pendingCount = submissions.filter((s) => s.status === "Pending").length;
  const approvedCount = submissions.filter((s) => s.status === "Approved").length;
  const rejectedCount = submissions.filter((s) => s.status === "Rejected").length;
  const flaggedCount = submissions.filter((s) => s.status === "Flagged").length;
  const totalPayoutApproved = submissions.filter((s) => s.status === "Approved").reduce((a, s) => a + s.payoutNum, 0);

  const SortIcon = ({ col }: { col: SortKey }) => (
    <ArrowUpDown className={`w-3.5 h-3.5 inline-block ml-1 ${sortKey === col ? "text-[#0159C7]" : "text-[#9CA3AF]"}`} />
  );

  return (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[#272936] truncate" style={{ fontSize: 24, fontWeight: 700 }}>Giftcard Management</h1>
          <p className="text-[#6B7280] truncate" style={{ fontSize: 14 }}>Review and process gift card submissions · {filtered.length} results</p>
        </div>
        <div className="flex items-center gap-3">
          {canExport && (
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-[#6B7280] hover:bg-[#F5F7FB] transition-colors" style={{ fontSize: 13, fontWeight: 500 }}>
              <Download className="w-4 h-4" /> Export
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total", value: submissions.length, color: "#0159C7", flt: "All" as const },
          { label: "Pending", value: pendingCount, color: "#F59E0B", flt: "Pending" as const },
          { label: "Approved", value: approvedCount, color: "#22C55E", flt: "Approved" as const },
          { label: "Rejected", value: rejectedCount, color: "#EF4444", flt: "Rejected" as const },
          { label: "Flagged", value: flaggedCount, color: "#EF4444", flt: "Flagged" as const },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => setTab(s.flt)}
            className={`bg-white rounded-2xl p-4 sm:p-5 border text-left transition-all min-w-0 overflow-hidden ${tab === s.flt ? "border-[#0159C7] ring-2 ring-[#0159C7]/10" : "border-border hover:border-[#D1D5DB]"}`}
          >
            <div className="text-[#272936] truncate" style={{ fontSize: 26, fontWeight: 700 }}>{s.value}</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-[#6B7280] truncate" style={{ fontSize: 13 }}>{s.label}</span>
            </div>
            {s.flt === "Approved" && (
              <div className="text-[#22C55E] mt-1 truncate" style={{ fontSize: 12, fontWeight: 600 }}>₦{totalPayoutApproved.toLocaleString()} paid</div>
            )}
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
                    message: `Approve ${selectedIds.size} selected submission(s)? Payouts will be credited to user wallets.`,
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
                    message: `Reject ${selectedIds.size} selected submission(s)? Users will be notified.`,
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
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-border space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 bg-[#F5F7FB] rounded-xl px-3 sm:px-4 py-2 flex-1 min-w-0">
              <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
              <input
                type="text"
                placeholder="Search by user, brand, ID..."
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
                  showFilterPanel || advFilterCount > 0
                    ? "border-[#0159C7] text-[#0159C7] bg-[#EEF2FF]"
                    : "border-border text-[#6B7280] hover:bg-[#F5F7FB]"
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
                    brandFilter={brandFilter} setBrandFilter={setBrandFilter}
                    countryFilter={countryFilter} setCountryFilter={setCountryFilter}
                    cardTypeFilter={cardTypeFilter} setCardTypeFilter={setCardTypeFilter}
                    brandOptions={Array.from(new Set(submissions.map((s) => s.brand))).sort()}
                    countryOptions={Array.from(new Set(submissions.map((s) => s.country))).sort()}
                    onClear={() => { setBrandFilter(""); setCountryFilter(""); setCardTypeFilter(""); }}
                    onClose={() => setShowFilterPanel(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {tabs.map((t) => {
              const count = t === "All" ? submissions.length : submissions.filter((s) => s.status === t).length;
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
                  <span
                    className={`px-1.5 py-0.5 rounded-full ${tab === t ? "bg-white/20 text-white" : "bg-[#E8EBF0] text-[#6B7280]"}`}
                    style={{ fontSize: 11, fontWeight: 600 }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-border">
          {paginated.length === 0 && (
            <div className="text-center py-16">
              <div className="text-[#6B7280]" style={{ fontSize: 14 }}>No submissions match your criteria.</div>
              <button onClick={() => { setSearch(""); setTab("All"); setBrandFilter(""); setCountryFilter(""); setCardTypeFilter(""); }} className="text-[#0159C7] mt-2" style={{ fontSize: 13, fontWeight: 600 }}>Clear all filters</button>
            </div>
          )}
          {paginated.map((s) => (
            <div key={s.id} className={`p-4 transition-colors ${selectedIds.has(s.id) ? "bg-[#EEF2FF]" : ""}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} className="w-4 h-4 rounded border-[#D1D5DB] text-[#0159C7] accent-[#0159C7] mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <BrandLogo name={s.brand} logoUrl={s.brandLogoUrl} size={28} />
                      <div className="min-w-0">
                        <div className="text-[#272936] truncate" style={{ fontSize: 14, fontWeight: 500 }}>{s.brand} · {s.value}</div>
                        <div className="text-[#9CA3AF]" style={{ fontSize: 11 }}>{s.id} · {s.country} · {s.cardType}</div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0 ${statusColors[s.status]}`} style={{ fontSize: 11, fontWeight: 600 }}>
                      {s.status === "Flagged" && <AlertTriangle className="w-3 h-3" />}
                      {s.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-2 text-[#6B7280]" style={{ fontSize: 12 }}>
                    <span>{s.user}</span>
                    <span>·</span>
                    <span>{s.time}</span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-[#F5F7FB] rounded-lg px-2.5 py-1.5 text-center flex-1">
                      <div className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>{s.value}</div>
                      <div className="text-[#9CA3AF]" style={{ fontSize: 10 }}>Value</div>
                    </div>
                    <div className="bg-[#F5F7FB] rounded-lg px-2.5 py-1.5 text-center flex-1">
                      <div className="text-[#6B7280]" style={{ fontSize: 13, fontWeight: 500 }}>{s.rate}</div>
                      <div className="text-[#9CA3AF]" style={{ fontSize: 10 }}>Rate</div>
                    </div>
                    <div className="bg-[#F5F7FB] rounded-lg px-2.5 py-1.5 text-center flex-1">
                      <div className="text-[#0159C7]" style={{ fontSize: 13, fontWeight: 600 }}>{s.payout}</div>
                      <div className="text-[#9CA3AF]" style={{ fontSize: 10 }}>Payout</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setDrawerSubmission(s)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#F5F7FB] text-[#6B7280] rounded-lg hover:bg-[#E8EBF0] transition-colors" style={{ fontSize: 12, fontWeight: 500 }}><Eye className="w-3.5 h-3.5" /> View</button>
                    {(s.status === "Pending" || s.status === "Flagged") && canTakeAction && (
                      <>
                        {canApprove && (
                          <button onClick={() => setApproveTarget(s)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#22C55E]/10 text-[#22C55E] rounded-lg hover:bg-[#22C55E]/20 transition-colors" style={{ fontSize: 12, fontWeight: 500 }}><CheckCircle className="w-3.5 h-3.5" /> Approve</button>
                        )}
                        {canReject && (
                          <button onClick={() => setRejectTarget(s)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#EF4444]/10 text-[#EF4444] rounded-lg hover:bg-[#EF4444]/20 transition-colors" style={{ fontSize: 12, fontWeight: 500 }}><XCircle className="w-3.5 h-3.5" /> Reject</button>
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
                  { key: "brand" as SortKey, label: "BRAND" },
                  { key: null, label: "COUNTRY" },
                  { key: "valueNum" as SortKey, label: "VALUE" },
                  { key: "payoutNum" as SortKey, label: "PAYOUT" },
                  { key: "status" as SortKey, label: "STATUS" },
                  { key: "time" as SortKey, label: "TIME" },
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
                    <div className="text-[#6B7280]" style={{ fontSize: 14 }}>No submissions match your criteria.</div>
                    <button onClick={() => { setSearch(""); setTab("All"); setBrandFilter(""); setCountryFilter(""); setCardTypeFilter(""); }} className="text-[#0159C7] mt-2" style={{ fontSize: 13, fontWeight: 600 }}>Clear all filters</button>
                  </td>
                </tr>
              )}
              {paginated.map((s) => (
                <tr
                  key={s.id}
                  className={`border-t border-border transition-colors ${selectedIds.has(s.id) ? "bg-[#EEF2FF]" : "hover:bg-[#F5F7FB]/50"}`}
                >
                  <td className="px-5 py-4">
                    <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} className="w-4 h-4 rounded border-[#D1D5DB] text-[#0159C7] cursor-pointer accent-[#0159C7]" />
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => setDrawerSubmission(s)} className="text-[#0159C7] hover:underline" style={{ fontSize: 13, fontWeight: 600 }}>{s.id}</button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[#272936]" style={{ fontSize: 13 }}>{s.user}</div>
                    <div className="text-[#9CA3AF]" style={{ fontSize: 11 }}>{s.userEmail}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <BrandLogo name={s.brand} logoUrl={s.brandLogoUrl} size={28} />
                      <span className="text-[#272936]" style={{ fontSize: 13, fontWeight: 500 }}>{s.brand}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[#6B7280]" style={{ fontSize: 13 }}>{s.country}</td>
                  <td className="px-5 py-4 text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>{s.value}</td>
                  <td className="px-5 py-4 text-[#0159C7]" style={{ fontSize: 13, fontWeight: 600 }}>{s.payout}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${statusColors[s.status]}`} style={{ fontSize: 12, fontWeight: 600 }}>
                      {s.status === "Flagged" && <AlertTriangle className="w-3 h-3" />}
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#6B7280]" style={{ fontSize: 13 }}>{s.time}</td>
                  <td className="px-5 py-4">
                    <div className="relative" ref={actionMenu === s.id ? actionMenuRef : undefined}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === s.id ? null : s.id); }}
                        className="p-1.5 hover:bg-[#F5F7FB] rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-[#6B7280]" />
                      </button>
                      <AnimatePresence>
                        {actionMenu === s.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-border py-1.5 w-48 z-20"
                          >
                            <button
                              onClick={() => { setDrawerSubmission(s); setActionMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#272936] hover:bg-[#F5F7FB] transition-colors"
                              style={{ fontSize: 13 }}
                            >
                              <Eye className="w-4 h-4 text-[#6B7280]" /> View Details
                            </button>
                            {s.hasImage && (
                              <button
                                onClick={() => { setImageViewerUrl(s.imageUrl); setActionMenu(null); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#272936] hover:bg-[#F5F7FB] transition-colors"
                                style={{ fontSize: 13 }}
                              >
                                <ImageIcon className="w-4 h-4 text-[#6B7280]" /> View Image
                              </button>
                            )}
                            {(s.status === "Pending" || s.status === "Flagged") && canTakeAction && (
                              <>
                                <div className="mx-3 my-1 border-t border-border" />
                                {canApprove && (
                                  <button
                                    onClick={() => { setApproveTarget(s); setActionMenu(null); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#22C55E] hover:bg-[#22C55E]/5 transition-colors"
                                    style={{ fontSize: 13 }}
                                  >
                                    <CheckCircle className="w-4 h-4" /> Approve
                                  </button>
                                )}
                                {canReject && (
                                  <button
                                    onClick={() => { setRejectTarget(s); setActionMenu(null); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#EF4444] hover:bg-[#EF4444]/5 transition-colors"
                                    style={{ fontSize: 13 }}
                                  >
                                    <XCircle className="w-4 h-4" /> Reject
                                  </button>
                                )}
                                {(canApprove || canReject || canFlag) && <div className="mx-3 my-1 border-t border-border" />}
                                {s.status === "Pending" && canFlag && (
                                  <button
                                    onClick={() => { flagSubmission(s.id); setActionMenu(null); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#F59E0B] hover:bg-[#F59E0B]/5 transition-colors"
                                    style={{ fontSize: 13 }}
                                  >
                                    <Flag className="w-4 h-4" /> Flag for Review
                                  </button>
                                )}
                                {s.status === "Flagged" && canFlag && (
                                  <button
                                    onClick={() => { unflagSubmission(s.id); setActionMenu(null); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#0159C7] hover:bg-[#0159C7]/5 transition-colors"
                                    style={{ fontSize: 13 }}
                                  >
                                    <FlagOff className="w-4 h-4" /> Remove Flag
                                  </button>
                                )}
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
        {drawerSubmission && (
          <SubmissionDrawer
            key="drawer"
            submission={drawerSubmission}
            onClose={() => setDrawerSubmission(null)}
            onApprove={canApprove ? () => setApproveTarget(drawerSubmission) : undefined}
            onReject={canReject ? () => setRejectTarget(drawerSubmission) : undefined}
            onFlag={canFlag ? () => flagSubmission(drawerSubmission.id) : undefined}
            onUnflag={canFlag ? () => unflagSubmission(drawerSubmission.id) : undefined}
            onViewImage={() => setImageViewerUrl(drawerSubmission?.imageUrl ?? null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {approveTarget && (
          <ApproveModal
            key="approve"
            submission={approveTarget}
            onClose={() => setApproveTarget(null)}
            onConfirm={(note) => approveSubmission(approveTarget.id, note)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rejectTarget && (
          <RejectModal
            key="reject"
            submission={rejectTarget}
            onClose={() => setRejectTarget(null)}
            onConfirm={(reason, note) => rejectSubmission(rejectTarget.id, reason, note)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {imageViewerUrl !== null && <ImageViewerModal key="img" imageUrl={imageViewerUrl} onClose={() => setImageViewerUrl(null)} />}
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
