import { useState, useRef, useEffect } from "react";
import {
  Bell, X, Megaphone, Check, Send, ChevronDown, Clock, Users,
  AlertCircle, Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { giftcardsService, notificationsService } from "../../../services";

// ── Types ──
interface Notification {
  id: number;
  type: "rate_update" | "withdrawal" | "giftcard" | "system" | "announcement";
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: typeof Megaphone;
  iconColor: string;
  iconBg: string;
}

// Brand picker entry, sourced from /admin/rates. `id` is a string (rate id)
// and `rate` is the configured payout per unit. There's no `prevRate` because
// the rate API doesn't expose history — admins can still describe changes
// freely in the message body.
interface RateBrand {
  id: string;
  name: string;
  country: string;
  rate: number;
  currency: string;
}

// Notifications and sent-announcement history start empty. The backend
// doesn't yet expose an admin notifications-feed endpoint or a sent-broadcast
// log, so the panel only shows items emitted within the current session
// (locally appended after a successful broadcast).
//
// TODO: wire to a future GET /admin/notifications endpoint when it lands.

// ── Sent Announcements History ──
interface SentAnnouncement {
  id: number;
  title: string;
  message: string;
  brands: string[];
  sentBy: string;
  sentAt: string;
  recipientCount: number;
}

// ── Announcement Composer Modal ──
function AnnouncementModal({
  onClose,
  onSend,
  rateBrands,
}: {
  onClose: () => void;
  onSend: (data: { title: string; message: string; selectedBrands: RateBrand[]; channels: string[] }) => void;
  rateBrands: RateBrand[];
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>(["push", "in_app"]);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const brandPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (brandPickerRef.current && !brandPickerRef.current.contains(e.target as Node)) {
        setShowBrandPicker(false);
      }
    };
    if (showBrandPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showBrandPicker]);

  const selectedBrands = rateBrands.filter((b) => selectedBrandIds.includes(b.id));

  const toggleBrand = (id: string) => {
    setSelectedBrandIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllBrands = () => {
    if (selectedBrandIds.length === rateBrands.length) setSelectedBrandIds([]);
    else setSelectedBrandIds(rateBrands.map((b) => b.id));
  };

  const toggleChannel = (ch: string) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((x) => x !== ch) : [...prev, ch]
    );
  };

  const autoGenerateMessage = () => {
    if (selectedBrands.length === 0) {
      toast.error("Select at least one gift card brand first");
      return;
    }
    const brandList = selectedBrands
      .map((b) => `${b.name} (${b.country}): ₦${b.rate}/${b.currency || "$"}`)
      .join(", ");
    const msg = `We've updated our rates! ${brandList}. Trade now on Cardcentrals for the best value!`;

    const autoTitle =
      selectedBrands.length === 1
        ? `${selectedBrands[0].name} (${selectedBrands[0].country}) Rate Update`
        : `Rate Update: ${selectedBrands.length} Gift Cards`;

    if (!title) setTitle(autoTitle);
    setMessage(msg);
    toast.success("Message auto-generated from selected rates");
  };

  const canSend = title.trim() && message.trim() && selectedBrands.length > 0 && channels.length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0159C7]/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-[#0159C7]" />
            </div>
            <div>
              <h3 className="text-[#272936]" style={{ fontSize: 18, fontWeight: 700 }}>
                Push Rate Announcement
              </h3>
              <p className="text-[#6B7280]" style={{ fontSize: 12 }}>
                Notify users about gift card rate changes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#F5F7FB] flex items-center justify-center"
          >
            <X className="w-5 h-5 text-[#6B7280]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!previewMode ? (
            <div className="p-6 space-y-5">
              {/* Select Gift Card Brands */}
              <div>
                <label className="text-[#272936] block mb-2" style={{ fontSize: 13, fontWeight: 600 }}>
                  Select Gift Card Brands <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative" ref={brandPickerRef}>
                  <button
                    onClick={() => setShowBrandPicker(!showBrandPicker)}
                    className="w-full flex items-center justify-between px-4 py-3 border border-border rounded-xl hover:border-[#0159C7]/30 transition-colors text-left"
                  >
                    <span style={{ fontSize: 14, color: selectedBrands.length > 0 ? "#272936" : "#9CA3AF" }}>
                      {selectedBrands.length === 0
                        ? "Choose brands to announce..."
                        : `${selectedBrands.length} brand${selectedBrands.length > 1 ? "s" : ""} selected`}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${showBrandPicker ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {showBrandPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-border shadow-xl z-10 max-h-56 overflow-y-auto"
                      >
                        <button
                          onClick={selectAllBrands}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[#0159C7] hover:bg-[#F5F7FB] border-b border-border"
                          style={{ fontSize: 13, fontWeight: 600 }}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            selectedBrandIds.length === rateBrands.length
                              ? "bg-[#0159C7] border-[#0159C7]"
                              : "border-[#D1D5DB]"
                          }`}>
                            {selectedBrandIds.length === rateBrands.length && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          {selectedBrandIds.length === rateBrands.length ? "Deselect All" : "Select All"}
                        </button>
                        {rateBrands.length === 0 ? (
                          <div className="px-4 py-6 text-center text-[#9CA3AF]" style={{ fontSize: 12 }}>
                            No rates configured yet
                          </div>
                        ) : (
                          rateBrands.map((b) => {
                            const isSelected = selectedBrandIds.includes(b.id);
                            return (
                              <button
                                key={b.id}
                                onClick={() => toggleBrand(b.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F5F7FB] transition-colors ${
                                  isSelected ? "bg-[#0159C7]/5" : ""
                                }`}
                              >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-[#0159C7] border-[#0159C7]" : "border-[#D1D5DB]"
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex-1 text-left">
                                  <span className="text-[#272936]" style={{ fontSize: 13, fontWeight: 500 }}>
                                    {b.name}
                                  </span>
                                  <span className="text-[#9CA3AF] ml-1" style={{ fontSize: 11 }}>({b.country})</span>
                                </div>
                                <span className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>
                                  ₦{b.rate}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Selected brand chips */}
                {selectedBrands.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedBrands.map((b) => (
                      <span
                        key={b.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0159C7]/10 text-[#0159C7] rounded-lg"
                        style={{ fontSize: 12, fontWeight: 500 }}
                      >
                        {b.name} ({b.country}) · ₦{b.rate}
                        <button onClick={() => toggleBrand(b.id)} className="hover:text-[#EF4444]">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Announcement Title */}
              <div>
                <label className="text-[#272936] block mb-2" style={{ fontSize: 13, fontWeight: 600 }}>
                  Announcement Title <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. iTunes & Amazon Rates Are Up!"
                  className="w-full px-4 py-3 border border-border rounded-xl text-[#272936] focus:border-[#0159C7] focus:ring-2 focus:ring-[#0159C7]/10 outline-none transition-all"
                  style={{ fontSize: 14 }}
                  maxLength={100}
                />
                <div className="text-right text-[#9CA3AF] mt-1" style={{ fontSize: 11 }}>
                  {title.length}/100
                </div>
              </div>

              {/* Message Body */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>
                    Message <span className="text-[#EF4444]">*</span>
                  </label>
                  <button
                    onClick={autoGenerateMessage}
                    className="flex items-center gap-1.5 text-[#0159C7] hover:text-[#014BA8] transition-colors"
                    style={{ fontSize: 12, fontWeight: 600 }}
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    Auto-generate
                  </button>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your announcement message to users..."
                  rows={4}
                  className="w-full px-4 py-3 border border-border rounded-xl text-[#272936] focus:border-[#0159C7] focus:ring-2 focus:ring-[#0159C7]/10 outline-none transition-all resize-none"
                  style={{ fontSize: 14, lineHeight: 1.6 }}
                  maxLength={500}
                />
                <div className="text-right text-[#9CA3AF] mt-1" style={{ fontSize: 11 }}>
                  {message.length}/500
                </div>
              </div>

              {/* Delivery Channels */}
              <div>
                <label className="text-[#272936] block mb-2" style={{ fontSize: 13, fontWeight: 600 }}>
                  Delivery Channels
                </label>
                <div className="flex gap-3">
                  {[
                    { key: "push", label: "Push Notification", icon: Bell },
                    { key: "in_app", label: "In-App Banner", icon: Megaphone },
                    { key: "email", label: "Email", icon: Send },
                  ].map((ch) => (
                    <button
                      key={ch.key}
                      onClick={() => toggleChannel(ch.key)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${
                        channels.includes(ch.key)
                          ? "border-[#0159C7] bg-[#0159C7]/5 text-[#0159C7]"
                          : "border-border text-[#6B7280] hover:border-[#D1D5DB]"
                      }`}
                      style={{ fontSize: 12, fontWeight: 500 }}
                    >
                      <ch.icon className="w-4 h-4 shrink-0" />
                      <span className="hidden sm:inline">{ch.label}</span>
                      <span className="sm:hidden">{ch.label.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audience Info */}
              <div className="flex items-center gap-3 bg-[#F5F7FB] rounded-xl p-4">
                <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-[#22C55E]" />
                </div>
                <div>
                  <div className="text-[#272936]" style={{ fontSize: 14, fontWeight: 600 }}>
                    All active users
                  </div>
                  <div className="text-[#6B7280]" style={{ fontSize: 12 }}>
                    This announcement will be broadcast to every user with a registered device
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Preview Mode */
            <div className="p-6 space-y-5">
              <div className="bg-[#F5F7FB] rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0159C7] flex items-center justify-center shrink-0">
                    <Megaphone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[#272936]" style={{ fontSize: 16, fontWeight: 700 }}>
                      {title || "Untitled Announcement"}
                    </div>
                    <div className="text-[#6B7280] mt-0.5" style={{ fontSize: 11 }}>
                      Just now · Cardcentrals Team
                    </div>
                  </div>
                </div>
                <p className="text-[#272936]" style={{ fontSize: 14, lineHeight: 1.7 }}>
                  {message || "No message content."}
                </p>

                {/* Rate cards preview */}
                {selectedBrands.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedBrands.slice(0, 6).map((b) => (
                      <div key={b.id} className="bg-white rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <div className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>
                            {b.name}
                          </div>
                          <div className="text-[#9CA3AF]" style={{ fontSize: 10 }}>{b.country}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[#272936]" style={{ fontSize: 14, fontWeight: 700 }}>
                            ₦{b.rate}
                          </div>
                        </div>
                      </div>
                    ))}
                    {selectedBrands.length > 6 && (
                      <div className="bg-white rounded-xl p-3 flex items-center justify-center text-[#6B7280]" style={{ fontSize: 12, fontWeight: 500 }}>
                        +{selectedBrands.length - 6} more
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  <span className="text-[#9CA3AF]" style={{ fontSize: 11 }}>
                    Delivering via{" "}
                    {channels
                      .map((c) =>
                        c === "push" ? "Push Notification" : c === "in_app" ? "In-App Banner" : "Email"
                      )
                      .join(", ")}
                    {" "}to all active users
                  </span>
                </div>
              </div>

              <div className="bg-[#F59E0B]/10 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
                <div>
                  <div className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>
                    Ready to send?
                  </div>
                  <p className="text-[#6B7280]" style={{ fontSize: 12, lineHeight: 1.5 }}>
                    This announcement will be immediately delivered to all active users. Make sure the rates and message are accurate before sending.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0 bg-white">
          <button
            onClick={previewMode ? () => setPreviewMode(false) : onClose}
            className="px-4 py-2.5 text-[#6B7280] hover:text-[#272936] transition-colors"
            style={{ fontSize: 14, fontWeight: 500 }}
          >
            {previewMode ? "Back to Edit" : "Cancel"}
          </button>
          <div className="flex items-center gap-3">
            {!previewMode && (
              <button
                onClick={() => {
                  if (!canSend) {
                    toast.error("Please fill in all required fields");
                    return;
                  }
                  setPreviewMode(true);
                }}
                className="px-5 py-2.5 border border-border rounded-xl text-[#272936] hover:bg-[#F5F7FB] transition-colors"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                Preview
              </button>
            )}
            <button
              onClick={() => {
                if (!canSend) {
                  toast.error("Please fill in all required fields");
                  return;
                }
                onSend({ title, message, selectedBrands, channels });
              }}
              disabled={!canSend}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white transition-colors ${
                canSend ? "bg-[#0159C7] hover:bg-[#014BA8]" : "bg-[#0159C7]/40 cursor-not-allowed"
              }`}
              style={{ fontSize: 14, fontWeight: 600 }}
            >
              <Send className="w-4 h-4" />
              Send Announcement
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Notification Panel Component ──
export function NotificationPanel() {
  const { hasPermission, currentUser } = useAdminAuth();
  const canPushAnnouncement = hasPermission("rates.edit");

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [sentAnnouncements, setSentAnnouncements] = useState<SentAnnouncement[]>([]);
  const [tab, setTab] = useState<"notifications" | "announcements">("notifications");
  const [rateBrands, setRateBrands] = useState<RateBrand[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canPushAnnouncement) return;
    let cancelled = false;
    giftcardsService
      .listRates(1, 100)
      .then((res) => {
        if (cancelled) return;
        setRateBrands(
          res.data.map((r) => ({
            id: r.id,
            name: r.brand?.name || "Unknown",
            country: r.countryCode,
            rate: r.ratePerUnit,
            currency: r.currency,
          }))
        );
      })
      .catch(() => {
        // Silent: brand picker will show empty state
      });
    return () => {
      cancelled = true;
    };
  }, [canPushAnnouncement]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleSendAnnouncement = async (data: {
    title: string;
    message: string;
    selectedBrands: RateBrand[];
    channels: string[];
  }) => {
    try {
      const result = await notificationsService.broadcast({
        title: data.title,
        body: data.message,
        type: "promotion",
        data: {
          brands: data.selectedBrands.map((b) => `${b.name} (${b.country})`).join(", "),
          channels: data.channels.join(","),
        },
      });

      const recipientCount = result.success;
      const now = new Date();
      const sentAt =
        now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
        " · " +
        now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      const newAnnouncement: SentAnnouncement = {
        id: Date.now(),
        title: data.title,
        message: data.message,
        brands: data.selectedBrands.map((b) => `${b.name} (${b.country})`),
        sentBy: currentUser?.fullName || "Admin",
        sentAt,
        recipientCount,
      };
      setSentAnnouncements((prev) => [newAnnouncement, ...prev]);

      const newNotif: Notification = {
        id: Date.now(),
        type: "announcement",
        title: "Announcement Sent",
        message: `"${data.title}" pushed to ${recipientCount.toLocaleString()} user(s) via ${data.channels.length} channel(s).`,
        time: "Just now",
        read: false,
        icon: Megaphone,
        iconColor: "#0159C7",
        iconBg: "#0159C7",
      };
      setNotifications((prev) => [newNotif, ...prev]);

      setShowAnnouncementModal(false);
      toast.success(
        `Announcement "${data.title}" sent to ${recipientCount.toLocaleString()} user(s)` +
          (result.failure > 0 ? ` (${result.failure} failed)` : ""),
        { duration: 4000 }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send announcement";
      toast.error(msg);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <Toaster position="top-right" richColors />
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1 hover:bg-[#F5F7FB] rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-[#6B7280]" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] text-white rounded-full flex items-center justify-center"
            style={{ fontSize: 10, fontWeight: 600 }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-[400px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-border z-50 overflow-hidden"
          >
            {/* Panel Header */}
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#272936]" style={{ fontSize: 16, fontWeight: 700 }}>
                  Notifications
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[#0159C7] hover:text-[#014BA8] transition-colors"
                      style={{ fontSize: 12, fontWeight: 600 }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-[#F5F7FB] rounded-lg p-0.5">
                <button
                  onClick={() => setTab("notifications")}
                  className={`flex-1 py-1.5 rounded-md transition-colors ${
                    tab === "notifications"
                      ? "bg-white text-[#272936] shadow-sm"
                      : "text-[#6B7280] hover:text-[#272936]"
                  }`}
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  All ({notifications.length})
                </button>
                {canPushAnnouncement && (
                  <button
                    onClick={() => setTab("announcements")}
                    className={`flex-1 py-1.5 rounded-md transition-colors ${
                      tab === "announcements"
                        ? "bg-white text-[#272936] shadow-sm"
                        : "text-[#6B7280] hover:text-[#272936]"
                    }`}
                    style={{ fontSize: 12, fontWeight: 600 }}
                  >
                    Sent ({sentAnnouncements.length})
                  </button>
                )}
              </div>
            </div>

            {/* Push Announcement Button (Super Admin / Admin only) */}
            {canPushAnnouncement && tab === "notifications" && (
              <div className="px-4 py-3 border-b border-border">
                <button
                  onClick={() => {
                    setOpen(false);
                    setShowAnnouncementModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0159C7] text-white rounded-xl hover:bg-[#014BA8] transition-colors"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  <Megaphone className="w-4 h-4" />
                  Push Rate Announcement
                </button>
              </div>
            )}

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto">
              {tab === "notifications" ? (
                notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bell className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
                    <p className="text-[#6B7280]" style={{ fontSize: 14 }}>No notifications</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const Icon = n.icon;
                    return (
                      <button
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-[#F5F7FB] transition-colors border-b border-border/50 last:border-0 ${
                          !n.read ? "bg-[#0159C7]/3" : ""
                        }`}
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: `${n.iconBg}12` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: n.iconColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[#272936] truncate" style={{ fontSize: 13, fontWeight: 600 }}>
                              {n.title}
                            </span>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-[#0159C7] shrink-0" />
                            )}
                          </div>
                          <p className="text-[#6B7280] mt-0.5 line-clamp-2" style={{ fontSize: 12, lineHeight: 1.5 }}>
                            {n.message}
                          </p>
                          <span className="text-[#9CA3AF] mt-1 block" style={{ fontSize: 11 }}>
                            {n.time}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )
              ) : (
                /* Sent Announcements Tab */
                sentAnnouncements.length === 0 ? (
                  <div className="py-12 text-center">
                    <Megaphone className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
                    <p className="text-[#6B7280]" style={{ fontSize: 14 }}>No announcements sent yet</p>
                  </div>
                ) : (
                  sentAnnouncements.map((a) => (
                    <div
                      key={a.id}
                      className="px-5 py-4 border-b border-border/50 last:border-0 hover:bg-[#F5F7FB] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0159C7]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Megaphone className="w-4 h-4 text-[#0159C7]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>
                            {a.title}
                          </div>
                          <p className="text-[#6B7280] mt-0.5 line-clamp-2" style={{ fontSize: 12, lineHeight: 1.5 }}>
                            {a.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-[#9CA3AF]" style={{ fontSize: 11 }}>
                              <Users className="w-3 h-3" /> {a.recipientCount.toLocaleString()} users
                            </span>
                            <span className="flex items-center gap-1 text-[#9CA3AF]" style={{ fontSize: 11 }}>
                              <Shield className="w-3 h-3" /> {a.sentBy}
                            </span>
                            <span className="text-[#9CA3AF]" style={{ fontSize: 11 }}>
                              {a.sentAt}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {a.brands.map((b) => (
                              <span
                                key={b}
                                className="px-2 py-0.5 bg-[#0159C7]/8 text-[#0159C7] rounded-md"
                                style={{ fontSize: 10, fontWeight: 600 }}
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcement Modal */}
      <AnimatePresence>
        {showAnnouncementModal && (
          <AnnouncementModal
            onClose={() => setShowAnnouncementModal(false)}
            onSend={handleSendAnnouncement}
            rateBrands={rateBrands}
          />
        )}
      </AnimatePresence>
    </div>
  );
}