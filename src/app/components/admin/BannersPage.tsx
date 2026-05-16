import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Search, X, Edit2, Trash2, MoreVertical, ArrowUp, ArrowDown,
  Eye, EyeOff, CheckCircle, Clock, XCircle, Calendar, Copy,
  Image as ImageIcon, Upload, RefreshCw, Smartphone, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { api } from "../../../lib/api";
import type { PaginatedResponse } from "../../../types";

// ── Types ──
interface Banner {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaLink: string;
  imageUrl: string;
  bgGradient: string;
  status: "active" | "scheduled" | "inactive" | "expired";
  priority: number;
  startDate: string;
  endDate: string;
  targetScreen: string;
  clicks: number;
  impressions: number;
  createdAt: string;
}

const targetScreenOptions = [
  { value: "home", label: "Home Dashboard" },
  { value: "sell-giftcard", label: "Sell Giftcard" },
  { value: "rate-calc", label: "Rate Calculator" },
  { value: "wallet", label: "Wallet" },
  { value: "withdrawal", label: "Withdrawal" },
  { value: "transactions", label: "Transaction History" },
  { value: "profile", label: "Profile" },
  { value: "notifications", label: "Notifications" },
  { value: "settings", label: "Settings" },
  { value: "external", label: "External URL" },
  { value: "none", label: "No Action" },
];

const gradientOptions = [
  { value: "from-[#126CF8] to-[#0159C7]", label: "Blue", preview: "linear-gradient(to right, #126CF8, #0159C7)" },
  { value: "from-[#22C55E] to-[#16A34A]", label: "Green", preview: "linear-gradient(to right, #22C55E, #16A34A)" },
  { value: "from-[#8B5CF6] to-[#6D28D9]", label: "Purple", preview: "linear-gradient(to right, #8B5CF6, #6D28D9)" },
  { value: "from-[#F59E0B] to-[#D97706]", label: "Amber", preview: "linear-gradient(to right, #F59E0B, #D97706)" },
  { value: "from-[#EF4444] to-[#DC2626]", label: "Red", preview: "linear-gradient(to right, #EF4444, #DC2626)" },
  { value: "from-[#EC4899] to-[#DB2777]", label: "Pink", preview: "linear-gradient(to right, #EC4899, #DB2777)" },
  { value: "from-[#272936] to-[#3a3c4e]", label: "Dark", preview: "linear-gradient(to right, #272936, #3a3c4e)" },
  { value: "from-[#0EA5E9] to-[#0284C7]", label: "Sky", preview: "linear-gradient(to right, #0EA5E9, #0284C7)" },
];


// ── Status Badge ──
function StatusBadge({ status }: { status: Banner["status"] }) {
  const cfg = {
    active: { bg: "bg-[#22C55E]/10", text: "text-[#22C55E]", label: "Active", icon: CheckCircle },
    scheduled: { bg: "bg-[#0159C7]/10", text: "text-[#0159C7]", label: "Scheduled", icon: Clock },
    inactive: { bg: "bg-[#6B7280]/10", text: "text-[#6B7280]", label: "Inactive", icon: EyeOff },
    expired: { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", label: "Expired", icon: XCircle },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`} style={{ fontSize: 12, fontWeight: 600 }}>
      <cfg.icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

// ── Mobile Preview Component ──
function MobilePhonePreview({ banners, currentSlide, onSlideChange }: { banners: Banner[]; currentSlide: number; onSlideChange: (i: number) => void }) {
  const activeBanners = banners.filter((b) => b.status === "active" || b.status === "scheduled");
  const banner = activeBanners[currentSlide] || activeBanners[0];

  return (
    <div className="bg-[#272936] rounded-[2.5rem] p-3 w-[260px] shadow-2xl mx-auto">
      <div className="bg-white rounded-[2rem] overflow-hidden" style={{ height: 520 }}>
        {/* Status bar */}
        <div className="bg-[#0159C7] px-5 pt-3 pb-1 flex items-center justify-between">
          <span className="text-white" style={{ fontSize: 11, fontWeight: 600 }}>9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-2.5 border border-white rounded-sm relative"><div className="absolute inset-0.5 bg-white rounded-[1px]" /></div>
          </div>
        </div>
        {/* Header */}
        <div className="bg-[#0159C7] px-4 pb-4">
          <p className="text-white/70" style={{ fontSize: 11 }}>Good morning,</p>
          <p className="text-white" style={{ fontSize: 15, fontWeight: 700 }}>Adaeze 👋</p>
          <div className="mt-2 bg-white/15 rounded-xl p-3">
            <p className="text-white/60" style={{ fontSize: 10 }}>Available Balance</p>
            <p className="text-white" style={{ fontSize: 20, fontWeight: 700 }}>₦125,400</p>
          </div>
        </div>
        {/* Quick Actions */}
        <div className="px-4 pt-3 pb-2 flex gap-2">
          {["Sell", "Rates", "Withdraw"].map((a) => (
            <div key={a} className="flex-1 bg-[#F5F7FB] rounded-xl py-2 flex items-center justify-center">
              <span className="text-[#272936]" style={{ fontSize: 10, fontWeight: 600 }}>{a}</span>
            </div>
          ))}
        </div>
        {/* Banner Slider */}
        <div className="px-4 pt-1">
          {banner ? (
            <div className={`bg-gradient-to-r ${banner.bgGradient} rounded-xl p-3.5 relative overflow-hidden`}>
              {banner.imageUrl && (
                <div className="absolute inset-0 opacity-20">
                  <ImageWithFallback src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative z-10">
                <p className="text-white/70 mb-0.5" style={{ fontSize: 9, fontWeight: 600 }}>PROMO</p>
                <p className="text-white mb-0.5" style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{banner.title}</p>
                <p className="text-white/60" style={{ fontSize: 9 }}>{banner.subtitle.substring(0, 60)}...</p>
                {banner.ctaLabel && (
                  <div className="mt-2">
                    <span className="bg-white/25 text-white px-3 py-1 rounded-md" style={{ fontSize: 9, fontWeight: 600 }}>{banner.ctaLabel}</span>
                  </div>
                )}
              </div>
              {/* Dots */}
              {activeBanners.length > 1 && (
                <div className="relative z-10 flex justify-center gap-1 mt-2">
                  {activeBanners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => onSlideChange(i)}
                      className={`rounded-full transition-all ${i === currentSlide ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#F5F7FB] rounded-xl p-6 text-center">
              <p className="text-[#9CA3AF]" style={{ fontSize: 11 }}>No active banners</p>
            </div>
          )}
        </div>
        {/* Transactions placeholder */}
        <div className="px-4 pt-3">
          <p className="text-[#272936] mb-2" style={{ fontSize: 11, fontWeight: 700 }}>Recent Transactions</p>
          {[1, 2].map((i) => (
            <div key={i} className="bg-[#F5F7FB] rounded-lg p-2 mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#0159C7]/10 rounded" />
                <div>
                  <div className="bg-[#E8EBF0] rounded h-2 w-16 mb-1" />
                  <div className="bg-[#E8EBF0] rounded h-1.5 w-10" />
                </div>
              </div>
              <div className="bg-[#E8EBF0] rounded h-2 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Banner Modal (Create/Edit) ──
function BannerModal({
  mode,
  banner,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  banner?: Banner;
  onClose: () => void;
  onSave: (data: Omit<Banner, "id" | "clicks" | "impressions" | "createdAt" | "priority">) => void;
}) {
  const [title, setTitle] = useState(banner?.title || "");
  const [subtitle, setSubtitle] = useState(banner?.subtitle || "");
  const [ctaLabel, setCtaLabel] = useState(banner?.ctaLabel || "");
  const [ctaLink, setCtaLink] = useState(banner?.ctaLink || "sell-giftcard");
  const [imageUrl, setImageUrl] = useState(banner?.imageUrl || "");
  const [bgGradient, setBgGradient] = useState(banner?.bgGradient || "from-[#126CF8] to-[#0159C7]");
  const [status, setStatus] = useState<Banner["status"]>(banner?.status || "active");
  const [startDate, setStartDate] = useState(banner?.startDate || "2026-03-12");
  const [endDate, setEndDate] = useState(banner?.endDate || "2026-04-12");
  const [targetScreen, setTargetScreen] = useState(banner?.targetScreen || "sell-giftcard");
  const [uploadPreview, setUploadPreview] = useState<string | null>(banner?.imageUrl || null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max file size: 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setUploadPreview(url);
      setImageUrl(url);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!title.trim()) { toast.error("Banner title is required"); return; }
    if (!subtitle.trim()) { toast.error("Subtitle is required"); return; }
    onSave({ title, subtitle, ctaLabel, ctaLink, imageUrl, bgGradient, status, startDate, endDate, targetScreen });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[92vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border shrink-0">
          <h3 className="text-[#272936] truncate pr-2" style={{ fontSize: 18, fontWeight: 700 }}>
            {mode === "create" ? "Create New Banner" : `Edit: ${banner?.title}`}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F5F7FB] flex items-center justify-center">
            <X className="w-5 h-5 text-[#6B7280]" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {/* Form - 3 cols */}
            <div className="lg:col-span-3 space-y-5">
              <div>
                <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Banner Title *</label>
                <input className="w-full bg-[#F5F7FB] border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0159C7] focus:border-transparent" placeholder="e.g. Get 5% bonus on iTunes cards!" value={title} onChange={(e) => setTitle(e.target.value)} style={{ fontSize: 14 }} />
              </div>
              <div>
                <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Subtitle / Description *</label>
                <textarea className="w-full bg-[#F5F7FB] border border-border rounded-xl px-4 py-2.5 outline-none resize-none focus:ring-2 focus:ring-[#0159C7] focus:border-transparent" rows={2} placeholder="Short description text for the banner..." value={subtitle} onChange={(e) => setSubtitle(e.target.value)} style={{ fontSize: 14 }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>CTA Button Label</label>
                  <input className="w-full bg-[#F5F7FB] border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0159C7] focus:border-transparent" placeholder="e.g. Trade Now" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} style={{ fontSize: 14 }} />
                </div>
                <div>
                  <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Target Screen</label>
                  <select value={targetScreen} onChange={(e) => { setTargetScreen(e.target.value); setCtaLink(e.target.value); }} className="w-full bg-[#F5F7FB] border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0159C7] focus:border-transparent" style={{ fontSize: 14 }}>
                    {targetScreenOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Background Gradient */}
              <div>
                <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Background Gradient</label>
                <div className="flex flex-wrap gap-2">
                  {gradientOptions.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setBgGradient(g.value)}
                      className={`w-10 h-10 rounded-xl transition-all ${bgGradient === g.value ? "ring-2 ring-offset-2 ring-[#0159C7] scale-110" : "hover:scale-105"}`}
                      style={{ background: g.preview }}
                      title={g.label}
                    />
                  ))}
                </div>
              </div>

              {/* Banner Image */}
              <div>
                <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Banner Image (Optional)</label>
                <p className="text-[#9CA3AF] mb-2" style={{ fontSize: 12 }}>Overlay image for the banner. Recommended: 800x400px, max 5MB</p>
                {uploadPreview ? (
                  <div className="border-2 border-[#0159C7]/20 bg-[#0159C7]/5 rounded-xl p-3">
                    <div className="rounded-lg overflow-hidden mb-2 border border-border" style={{ height: 100 }}>
                      <ImageWithFallback src={uploadPreview} alt="Banner" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7280] truncate" style={{ fontSize: 12 }}>Image uploaded</span>
                      <div className="flex gap-1">
                        <button onClick={() => fileRef.current?.click()} className="p-1.5 hover:bg-white rounded-lg"><RefreshCw className="w-3.5 h-3.5 text-[#6B7280]" /></button>
                        <button onClick={() => { setUploadPreview(null); setImageUrl(""); }} className="p-1.5 hover:bg-[#EF4444]/10 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-[#EF4444]" /></button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragging ? "border-[#0159C7] bg-[#0159C7]/5" : "border-[#D1D5DB] hover:border-[#0159C7] hover:bg-[#F5F7FB]"}`}
                  >
                    <Upload className="w-6 h-6 text-[#0159C7] mx-auto mb-2" />
                    <p className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>Click or drag to upload</p>
                    <p className="text-[#9CA3AF]" style={{ fontSize: 11 }}>PNG, JPG, WebP up to 5MB</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
              </div>

              {/* Schedule & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-[#F5F7FB] border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#0159C7] focus:border-transparent" style={{ fontSize: 13 }} />
                </div>
                <div>
                  <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-[#F5F7FB] border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#0159C7] focus:border-transparent" style={{ fontSize: 13 }} />
                </div>
                <div>
                  <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as Banner["status"])} className="w-full bg-[#F5F7FB] border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#0159C7] focus:border-transparent" style={{ fontSize: 13 }}>
                    <option value="active">Active</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Live Preview - 2 cols */}
            <div className="lg:col-span-2">
              <label className="block text-[#272936] mb-3" style={{ fontSize: 13, fontWeight: 600 }}>Live Preview</label>
              <div className="bg-[#F5F7FB] rounded-xl p-4">
                <p className="text-center text-[#9CA3AF] mb-3" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>MOBILE APP BANNER</p>
                <div className={`bg-gradient-to-r ${bgGradient} rounded-2xl p-5 relative overflow-hidden`} style={{ minHeight: 130 }}>
                  {uploadPreview && (
                    <div className="absolute inset-0 opacity-20">
                      <ImageWithFallback src={uploadPreview} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="relative z-10">
                    <p className="text-white/70 mb-1" style={{ fontSize: 11, fontWeight: 600 }}>PROMO</p>
                    <h3 className="text-white mb-1" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{title || "Banner Title"}</h3>
                    <p className="text-white/60 mb-3" style={{ fontSize: 11, lineHeight: 1.4 }}>{subtitle ? subtitle.substring(0, 80) + (subtitle.length > 80 ? "..." : "") : "Banner subtitle text"}</p>
                    {ctaLabel && (
                      <span className="bg-white/25 text-white px-4 py-1.5 rounded-lg" style={{ fontSize: 12, fontWeight: 600 }}>{ctaLabel}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <div className="w-5 h-1.5 bg-[#0159C7] rounded-full" />
                  <div className="w-1.5 h-1.5 bg-[#D1D5DB] rounded-full" />
                  <div className="w-1.5 h-1.5 bg-[#D1D5DB] rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-[#6B7280] hover:bg-[#F5F7FB]" style={{ fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-[#0159C7] text-white rounded-xl hover:bg-[#014BA8]" style={{ fontSize: 14, fontWeight: 600 }}>
            {mode === "create" ? "Create Banner" : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Confirm Modal ──
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

// ── Main Page ──
export function BannersPage() {
  const { hasPermission } = useAdminAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showModal, setShowModal] = useState<{ mode: "create" | "edit"; banner?: Banner } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; confirmLabel: string; confirmColor: string; onConfirm: () => void } | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [previewSlide, setPreviewSlide] = useState(0);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // ── Load banners from backend ──────────────────────────────────────────────
  useEffect(() => {
    api.get<PaginatedResponse<Banner>>("/admin/banners?limit=100&page=1")
      .then((res) => setBanners(res.data))
      .catch(() => toast.error("Failed to load banners"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) setActionMenu(null); };
    if (actionMenu !== null) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [actionMenu]);

  const filtered = banners
    .filter((b) => filterStatus === "all" || b.status === filterStatus)
    .filter((b) => !search || b.title.toLowerCase().includes(search.toLowerCase()) || b.subtitle.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.priority - b.priority);

  const activeBanners = banners.filter((b) => b.status === "active");
  const previewableBanners = banners.filter((b) => b.status === "active" || b.status === "scheduled");

  const createBanner = (data: Omit<Banner, "id" | "clicks" | "impressions" | "createdAt" | "priority">) => {
    api.post<Banner>("/admin/banners", { ...data, priority: banners.length + 1 })
      .then((created) => {
        setBanners((prev) => [...prev, created]);
        toast.success(`Banner "${created.title}" created`);
        setShowModal(null);
      })
      .catch((err: Error) => toast.error(err.message || "Failed to create banner"));
  };

  const editBanner = (id: string, data: Omit<Banner, "id" | "clicks" | "impressions" | "createdAt" | "priority">) => {
    api.put<Banner>(`/admin/banners/${id}`, data)
      .then((updated) => {
        setBanners((prev) => prev.map((b) => b.id === id ? updated : b));
        toast.success("Banner updated");
        setShowModal(null);
      })
      .catch((err: Error) => toast.error(err.message || "Failed to update banner"));
  };

  const deleteBanner = (id: string) => {
    const b = banners.find((x) => x.id === id);
    api.delete(`/admin/banners/${id}`)
      .then(() => {
        setBanners((prev) => prev.filter((x) => x.id !== id));
        toast.success(`Banner "${b?.title}" deleted`);
        setConfirmModal(null);
      })
      .catch((err: Error) => toast.error(err.message || "Failed to delete banner"));
  };

  const toggleStatus = (id: string) => {
    const b = banners.find((x) => x.id === id);
    if (!b) return;
    const newStatus = b.status === "active" ? "inactive" : "active";
    api.put<Banner>(`/admin/banners/${id}`, { status: newStatus })
      .then((updated) => {
        setBanners((prev) => prev.map((x) => x.id === id ? updated : x));
        toast.success(`Banner "${b.title}" is now ${newStatus}`);
      })
      .catch((err: Error) => toast.error(err.message || "Failed to update status"));
  };

  const moveBanner = (id: string, direction: "up" | "down") => {
    const sorted = [...banners].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex((b) => b.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const newPriority = sorted[swapIdx].priority;
    const swapPriority = sorted[idx].priority;

    // Optimistic update
    setBanners((prev) => prev.map((b) => {
      if (b.id === sorted[idx].id) return { ...b, priority: newPriority };
      if (b.id === sorted[swapIdx].id) return { ...b, priority: swapPriority };
      return b;
    }));

    // Persist both changes
    Promise.all([
      api.put(`/admin/banners/${sorted[idx].id}`, { priority: newPriority }),
      api.put(`/admin/banners/${sorted[swapIdx].id}`, { priority: swapPriority }),
    ]).catch(() => toast.error("Failed to save new order"));
  };

  const duplicateBanner = (banner: Banner) => {
    api.post<Banner>("/admin/banners", {
      title: `${banner.title} (Copy)`,
      subtitle: banner.subtitle,
      ctaLabel: banner.ctaLabel,
      ctaLink: banner.ctaLink,
      imageUrl: banner.imageUrl,
      bgGradient: banner.bgGradient,
      status: "inactive",
      priority: banners.length + 1,
      startDate: banner.startDate,
      endDate: banner.endDate,
      targetScreen: banner.targetScreen,
    })
      .then((dup) => {
        setBanners((prev) => [...prev, dup]);
        toast.success("Banner duplicated");
      })
      .catch((err: Error) => toast.error(err.message || "Failed to duplicate banner"));
  };

  const statusCounts = {
    all: banners.length,
    active: banners.filter((b) => b.status === "active").length,
    scheduled: banners.filter((b) => b.status === "scheduled").length,
    inactive: banners.filter((b) => b.status === "inactive").length,
    expired: banners.filter((b) => b.status === "expired").length,
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />

      {/* ─── 1. Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[#272936]" style={{ fontSize: 24, fontWeight: 700 }}>Banner Management</h1>
          <p className="text-[#6B7280]" style={{ fontSize: 14 }}>Manage slider banners for the mobile app home dashboard</p>
        </div>
        {hasPermission("banners.manage") && (
          <button
            onClick={() => setShowModal({ mode: "create" })}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0159C7] text-white rounded-xl hover:bg-[#014BA8] transition-colors"
            style={{ fontSize: 14, fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" /> Add Banner
          </button>
        )}
      </div>

      {/* ─── 2. Stats Cards (full width row) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-border">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#0159C7]/10 mb-2">
            <ImageIcon className="w-5 h-5 text-[#0159C7]" />
          </div>
          <div className="text-[#272936]" style={{ fontSize: 26, fontWeight: 700 }}>{statusCounts.all}</div>
          <div className="text-[#6B7280]" style={{ fontSize: 13 }}>Total Banners</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-border">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#22C55E]/10 mb-2">
            <CheckCircle className="w-5 h-5 text-[#22C55E]" />
          </div>
          <div className="text-[#22C55E]" style={{ fontSize: 26, fontWeight: 700 }}>{statusCounts.active}</div>
          <div className="text-[#6B7280]" style={{ fontSize: 13 }}>Active Now</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-border">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#0159C7]/10 mb-2">
            <Clock className="w-5 h-5 text-[#0159C7]" />
          </div>
          <div className="text-[#0159C7]" style={{ fontSize: 26, fontWeight: 700 }}>{statusCounts.scheduled}</div>
          <div className="text-[#6B7280]" style={{ fontSize: 13 }}>Scheduled</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-border">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#F59E0B]/10 mb-2">
            <Eye className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <div className="text-[#272936]" style={{ fontSize: 26, fontWeight: 700 }}>
            {banners.reduce((a, b) => a + b.clicks, 0).toLocaleString()}
          </div>
          <div className="text-[#6B7280]" style={{ fontSize: 13 }}>Total Clicks</div>
        </div>
      </div>

      {/* ─── 3. Search & Filters (full width row) ─── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-border">
          <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
          <input
            type="text"
            placeholder="Search banners..."
            className="bg-transparent border-none outline-none text-[#272936] w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: 14 }}
          />
          {search && <button onClick={() => setSearch("")}><X className="w-4 h-4 text-[#9CA3AF]" /></button>}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
          {(["all", "active", "scheduled", "inactive", "expired"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl transition-colors whitespace-nowrap shrink-0 ${filterStatus === s ? "bg-[#0159C7] text-white" : "bg-white border border-border text-[#6B7280] hover:bg-[#F5F7FB]"}`}
              style={{ fontSize: 13, fontWeight: 500 }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s]})
            </button>
          ))}
        </div>
      </div>

      {/* ─── 4. Main Content: Banner List + Phone Preview ─── */}
      <div className="flex gap-6 items-start">
        {/* Left: Banner List */}
        <div className="flex-1 min-w-0 space-y-3">
          {filtered.map((banner, idx) => {
            const ctr = banner.impressions > 0 ? ((banner.clicks / banner.impressions) * 100).toFixed(1) : "0.0";
            return (
              <motion.div
                key={banner.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-border hover:border-[#D1D5DB] transition-all group"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Banner Preview Stripe */}
                  <div className={`shrink-0 bg-gradient-to-r ${banner.bgGradient} p-4 relative overflow-hidden rounded-t-2xl sm:rounded-t-none sm:rounded-l-2xl sm:w-52`} style={{ minHeight: 100 }}>
                    {banner.imageUrl && (
                      <div className="absolute inset-0 opacity-20">
                        <ImageWithFallback src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="relative z-10">
                      <p className="text-white/60" style={{ fontSize: 10, fontWeight: 600 }}>PROMO</p>
                      <p className="text-white" style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{banner.title}</p>
                      {banner.ctaLabel && (
                        <span className="inline-block mt-2 bg-white/25 text-white px-3 py-0.5 rounded" style={{ fontSize: 10, fontWeight: 600 }}>{banner.ctaLabel}</span>
                      )}
                    </div>
                    <div className="absolute top-2 right-2 w-6 h-6 bg-black/30 text-white rounded-full flex items-center justify-center" style={{ fontSize: 10, fontWeight: 700 }}>
                      #{banner.priority}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-3 sm:p-4">
                    <div className="flex flex-col gap-3">
                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-[#272936]" style={{ fontSize: 15, fontWeight: 700 }}>{banner.title}</h3>
                          <StatusBadge status={banner.status} />
                        </div>
                        <p className="text-[#6B7280] mb-2" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{banner.subtitle}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="flex items-center gap-1 text-[#9CA3AF]" style={{ fontSize: 12 }}>
                            <Calendar className="w-3 h-3 shrink-0" /> {banner.startDate} → {banner.endDate}
                          </span>
                          <span className="text-[#9CA3AF]" style={{ fontSize: 12 }}>
                            Target: <span className="text-[#272936]" style={{ fontWeight: 500 }}>{targetScreenOptions.find((t) => t.value === banner.targetScreen)?.label}</span>
                          </span>
                        </div>
                      </div>

                      {/* Stats + Actions row */}
                      <div className="flex items-center justify-between gap-3 pt-1 border-t border-border sm:border-t-0 sm:pt-0">
                        {/* Stats */}
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="text-center">
                            <div className="text-[#272936]" style={{ fontSize: 13, fontWeight: 700 }}>{banner.impressions.toLocaleString()}</div>
                            <div className="text-[#9CA3AF]" style={{ fontSize: 10 }}>Views</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[#272936]" style={{ fontSize: 13, fontWeight: 700 }}>{banner.clicks.toLocaleString()}</div>
                            <div className="text-[#9CA3AF]" style={{ fontSize: 10 }}>Clicks</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[#0159C7]" style={{ fontSize: 13, fontWeight: 700 }}>{ctr}%</div>
                            <div className="text-[#9CA3AF]" style={{ fontSize: 10 }}>CTR</div>
                          </div>
                        </div>

                        {/* Actions - always visible */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {hasPermission("banners.manage") && (
                            <>
                              <button onClick={() => moveBanner(banner.id, "up")} className="p-1.5 hover:bg-[#F5F7FB] rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" title="Move up" disabled={idx === 0}>
                                <ArrowUp className={`w-4 h-4 ${idx === 0 ? "text-[#D1D5DB]" : "text-[#6B7280]"}`} />
                              </button>
                              <button onClick={() => moveBanner(banner.id, "down")} className="p-1.5 hover:bg-[#F5F7FB] rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" title="Move down" disabled={idx === filtered.length - 1}>
                                <ArrowDown className={`w-4 h-4 ${idx === filtered.length - 1 ? "text-[#D1D5DB]" : "text-[#6B7280]"}`} />
                              </button>

                              <div className="relative" ref={actionMenu === banner.id ? actionMenuRef : undefined}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === banner.id ? null : banner.id); }}
                                  className="p-1.5 hover:bg-[#F5F7FB] rounded-lg"
                                >
                                  <MoreVertical className="w-4 h-4 text-[#6B7280]" />
                                </button>
                                <AnimatePresence>
                                  {actionMenu === banner.id && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.95 }}
                                      className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-border py-1.5 w-48 z-20"
                                    >
                                      <button onClick={() => { setShowModal({ mode: "edit", banner }); setActionMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#272936] hover:bg-[#F5F7FB]" style={{ fontSize: 13 }}>
                                        <Edit2 className="w-4 h-4 text-[#6B7280]" /> Edit Banner
                                      </button>
                                      <button onClick={() => { toggleStatus(banner.id); setActionMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#272936] hover:bg-[#F5F7FB]" style={{ fontSize: 13 }}>
                                        {banner.status === "active" ? <EyeOff className="w-4 h-4 text-[#6B7280]" /> : <Eye className="w-4 h-4 text-[#6B7280]" />}
                                        {banner.status === "active" ? "Deactivate" : "Activate"}
                                      </button>
                                      <button onClick={() => { duplicateBanner(banner); setActionMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#272936] hover:bg-[#F5F7FB]" style={{ fontSize: 13 }}>
                                        <Copy className="w-4 h-4 text-[#6B7280]" /> Duplicate
                                      </button>
                                      <div className="mx-3 my-1 border-t border-border" />
                                      <button
                                        onClick={() => {
                                          setConfirmModal({
                                            title: "Delete Banner",
                                            message: `Permanently delete "${banner.title}"? This action cannot be undone.`,
                                            confirmLabel: "Delete",
                                            confirmColor: "#EF4444",
                                            onConfirm: () => deleteBanner(banner.id),
                                          });
                                          setActionMenu(null);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#EF4444] hover:bg-[#EF4444]/5"
                                        style={{ fontSize: 13 }}
                                      >
                                        <Trash2 className="w-4 h-4" /> Delete
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-border">
              <ImageIcon className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-[#6B7280]" style={{ fontSize: 14 }}>
                {search || filterStatus !== "all" ? "No banners match your filters." : "No banners yet. Create your first one!"}
              </p>
              {(search || filterStatus !== "all") && (
                <button onClick={() => { setSearch(""); setFilterStatus("all"); }} className="text-[#0159C7] mt-2" style={{ fontSize: 13, fontWeight: 600 }}>Clear filters</button>
              )}
            </div>
          )}
        </div>

        {/* Right: Sticky Phone Preview */}
        <div className="hidden xl:block w-[310px] shrink-0">
          <div className="sticky top-6">
            <div className="bg-white rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#0159C7]" />
                  <span className="text-[#272936]" style={{ fontSize: 14, fontWeight: 600 }}>App Preview</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPreviewSlide((p) => Math.max(0, p - 1))}
                    className="p-1.5 hover:bg-[#F5F7FB] rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
                  </button>
                  <button
                    onClick={() => setPreviewSlide((p) => Math.min(previewableBanners.length - 1, p + 1))}
                    className="p-1.5 hover:bg-[#F5F7FB] rounded-lg"
                  >
                    <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                  </button>
                </div>
              </div>
              <MobilePhonePreview
                banners={banners}
                currentSlide={previewSlide}
                onSlideChange={setPreviewSlide}
              />
              <p className="text-center text-[#9CA3AF] mt-3" style={{ fontSize: 11 }}>
                {activeBanners.length} active banner{activeBanners.length !== 1 ? "s" : ""} in rotation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <BannerModal
            key="banner-modal"
            mode={showModal.mode}
            banner={showModal.banner}
            onClose={() => setShowModal(null)}
            onSave={(data) => showModal.mode === "create" ? createBanner(data) : editBanner(showModal.banner!.id, data)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {confirmModal && <ConfirmModal key="confirm" {...confirmModal} onClose={() => setConfirmModal(null)} />}
      </AnimatePresence>
    </div>
  );
}