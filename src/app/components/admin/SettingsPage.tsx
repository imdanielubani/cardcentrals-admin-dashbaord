import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  RefreshCw,
  Gift,
  Loader2,
} from "lucide-react";
import { Toaster, toast } from "sonner";

import { settingsService } from "../../../services";
import { PageHeader, PageLoader } from "../shared";
import { useAdminAuth } from "../../context/AdminAuthContext";

type BrandAssets = {
  logoPreview: string | null;
  logoFileName: string | null;
  faviconPreview: string | null;
  faviconFileName: string | null;
};

export function SettingsPage() {
  const { hasPermission } = useAdminAuth();
  const canEdit = hasPermission("settings.edit");

  const [assets, setAssets] = useState<BrandAssets>({
    logoPreview: null,
    logoFileName: null,
    faviconPreview: null,
    faviconFileName: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoDragging, setLogoDragging] = useState(false);
  const [faviconDragging, setFaviconDragging] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    settingsService
      .getBrandAssets()
      .then((data) =>
        setAssets({
          logoPreview: (data as unknown as BrandAssets).logoPreview ?? null,
          logoFileName: (data as unknown as BrandAssets).logoFileName ?? null,
          faviconPreview: (data as unknown as BrandAssets).faviconPreview ?? null,
          faviconFileName: (data as unknown as BrandAssets).faviconFileName ?? null,
        }),
      )
      .catch(() => {
        /* not yet configured — keep empty state */
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleFileSelect = useCallback(
    (file: File, type: "logo" | "favicon") => {
      const validTypes = [
        "image/png",
        "image/jpeg",
        "image/svg+xml",
        "image/x-icon",
        "image/webp",
      ];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a PNG, JPG, SVG, or ICO file");
        return;
      }
      const maxSize = type === "logo" ? 2 * 1024 * 1024 : 512 * 1024;
      if (file.size > maxSize) {
        toast.error(
          `File too large. Max size: ${type === "logo" ? "2MB" : "512KB"}`,
        );
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setAssets((prev) =>
          type === "logo"
            ? { ...prev, logoPreview: dataUrl, logoFileName: file.name }
            : { ...prev, faviconPreview: dataUrl, faviconFileName: file.name },
        );
        toast.success(`${type === "logo" ? "Logo" : "Favicon"} selected`);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, type: "logo" | "favicon") => {
      e.preventDefault();
      if (type === "logo") setLogoDragging(false);
      else setFaviconDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file, type);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, type: "logo" | "favicon") => {
      e.preventDefault();
      if (type === "logo") setLogoDragging(true);
      else setFaviconDragging(true);
    },
    [],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent, type: "logo" | "favicon") => {
      e.preventDefault();
      if (type === "logo") setLogoDragging(false);
      else setFaviconDragging(false);
    },
    [],
  );

  const save = async () => {
    setIsSaving(true);
    try {
      await settingsService.updateBrandAssets({
        logoPreview: assets.logoPreview ?? undefined,
        logoFileName: assets.logoFileName ?? undefined,
        faviconPreview: assets.faviconPreview ?? undefined,
        faviconFileName: assets.faviconFileName ?? undefined,
      } as never);
      toast.success("Brand assets updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update brand assets");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="p-6 space-y-6">
      <Toaster richColors position="top-right" />

      <PageHeader
        title="Settings"
        subtitle="Platform brand assets displayed across the app"
      />

      <section className="bg-white rounded-2xl border border-border p-6">
        <h3 className="text-[#272936] mb-1" style={{ fontSize: 18, fontWeight: 600 }}>
          Brand Assets
        </h3>
        <p className="text-[#6B7280] mb-6" style={{ fontSize: 13 }}>
          Upload your platform logo and favicon. These are saved in Cardcentrals and
          picked up by the admin dashboard, the mobile app, and email templates.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── Logo ─────────────────────────────────────────────────────── */}
          <div>
            <label className="block text-[#272936] mb-2" style={{ fontSize: 14, fontWeight: 600 }}>
              Platform Logo
            </label>
            <p className="text-[#9CA3AF] mb-3" style={{ fontSize: 12 }}>
              Recommended: 400×120px, PNG or SVG, max 2MB
            </p>

            {assets.logoPreview ? (
              <div className="border-2 border-[#0159C7]/20 bg-[#0159C7]/5 rounded-xl p-4">
                <div
                  className="bg-white rounded-lg p-4 flex items-center justify-center mb-3 border border-border"
                  style={{ minHeight: 80 }}
                >
                  <img
                    src={assets.logoPreview}
                    alt="Logo preview"
                    className="max-h-16 max-w-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon className="w-4 h-4 text-[#0159C7] shrink-0" />
                    <span
                      className="text-[#272936] truncate"
                      style={{ fontSize: 13, fontWeight: 500 }}
                    >
                      {assets.logoFileName ?? "logo"}
                    </span>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        className="p-1.5 hover:bg-white rounded-lg transition-colors"
                        title="Replace logo"
                      >
                        <RefreshCw className="w-4 h-4 text-[#6B7280]" />
                      </button>
                      <button
                        onClick={() => {
                          setAssets((prev) => ({
                            ...prev,
                            logoPreview: null,
                            logoFileName: null,
                          }));
                          toast.success("Logo cleared (not saved yet)");
                        }}
                        className="p-1.5 hover:bg-[#EF4444]/10 rounded-lg transition-colors"
                        title="Remove logo"
                      >
                        <Trash2 className="w-4 h-4 text-[#EF4444]" />
                      </button>
                    </div>
                  )}
                </div>
                <div
                  className="bg-[#272936] rounded-lg p-4 flex items-center justify-center mt-3 border border-[#3a3c4e]"
                  style={{ minHeight: 60 }}
                >
                  <img
                    src={assets.logoPreview}
                    alt="Logo on dark"
                    className="max-h-12 max-w-full object-contain"
                  />
                </div>
                <p
                  className="text-[#9CA3AF] text-center mt-1"
                  style={{ fontSize: 11 }}
                >
                  Preview on dark background
                </p>
              </div>
            ) : (
              <div
                onDrop={canEdit ? (e) => handleDrop(e, "logo") : undefined}
                onDragOver={canEdit ? (e) => handleDragOver(e, "logo") : undefined}
                onDragLeave={canEdit ? (e) => handleDragLeave(e, "logo") : undefined}
                onClick={canEdit ? () => logoInputRef.current?.click() : undefined}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                } ${
                  logoDragging
                    ? "border-[#0159C7] bg-[#0159C7]/5"
                    : "border-[#D1D5DB] hover:border-[#0159C7] hover:bg-[#F5F7FB]"
                }`}
              >
                <div className="w-12 h-12 bg-[#0159C7]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-[#0159C7]" />
                </div>
                <p className="text-[#272936] mb-1" style={{ fontSize: 14, fontWeight: 600 }}>
                  {logoDragging ? "Drop your logo here" : "Click to upload or drag & drop"}
                </p>
                <p className="text-[#9CA3AF]" style={{ fontSize: 12 }}>
                  PNG, JPG, SVG up to 2MB
                </p>
              </div>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f, "logo");
                e.target.value = "";
              }}
            />
          </div>

          {/* ── Favicon ──────────────────────────────────────────────────── */}
          <div>
            <label className="block text-[#272936] mb-2" style={{ fontSize: 14, fontWeight: 600 }}>
              Favicon
            </label>
            <p className="text-[#9CA3AF] mb-3" style={{ fontSize: 12 }}>
              Recommended: 32×32px or 64×64px, PNG or ICO, max 512KB
            </p>

            {assets.faviconPreview ? (
              <div className="border-2 border-[#0159C7]/20 bg-[#0159C7]/5 rounded-xl p-4">
                <div className="flex items-center gap-6 mb-3 justify-center">
                  {[16, 32, 48].map((s) => (
                    <div key={s} className="text-center">
                      <div
                        className="bg-white rounded-lg border border-border p-2 flex items-center justify-center mb-1"
                        style={{ width: 56, height: 56 }}
                      >
                        <img
                          src={assets.faviconPreview ?? undefined}
                          alt={`${s}px`}
                          style={{ width: s, height: s }}
                          className="object-contain"
                        />
                      </div>
                      <span className="text-[#9CA3AF]" style={{ fontSize: 10 }}>
                        {s}px
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon className="w-4 h-4 text-[#0159C7] shrink-0" />
                    <span
                      className="text-[#272936] truncate"
                      style={{ fontSize: 13, fontWeight: 500 }}
                    >
                      {assets.faviconFileName ?? "favicon"}
                    </span>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => faviconInputRef.current?.click()}
                        className="p-1.5 hover:bg-white rounded-lg"
                      >
                        <RefreshCw className="w-4 h-4 text-[#6B7280]" />
                      </button>
                      <button
                        onClick={() => {
                          setAssets((prev) => ({
                            ...prev,
                            faviconPreview: null,
                            faviconFileName: null,
                          }));
                          toast.success("Favicon cleared (not saved yet)");
                        }}
                        className="p-1.5 hover:bg-[#EF4444]/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-[#EF4444]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                onDrop={canEdit ? (e) => handleDrop(e, "favicon") : undefined}
                onDragOver={canEdit ? (e) => handleDragOver(e, "favicon") : undefined}
                onDragLeave={canEdit ? (e) => handleDragLeave(e, "favicon") : undefined}
                onClick={canEdit ? () => faviconInputRef.current?.click() : undefined}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                } ${
                  faviconDragging
                    ? "border-[#0159C7] bg-[#0159C7]/5"
                    : "border-[#D1D5DB] hover:border-[#0159C7] hover:bg-[#F5F7FB]"
                }`}
              >
                <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Gift className="w-6 h-6 text-[#F59E0B]" />
                </div>
                <p className="text-[#272936] mb-1" style={{ fontSize: 14, fontWeight: 600 }}>
                  {faviconDragging ? "Drop your favicon here" : "Click to upload or drag & drop"}
                </p>
                <p className="text-[#9CA3AF]" style={{ fontSize: 12 }}>
                  PNG, ICO, SVG up to 512KB
                </p>
              </div>
            )}
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/png,image/x-icon,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f, "favicon");
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end mt-6 pt-4 border-t border-border">
            <button
              onClick={save}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0159C7] text-white rounded-xl hover:bg-[#014BA8] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ fontSize: 14, fontWeight: 600 }}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isSaving ? "Saving..." : "Save brand assets"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
