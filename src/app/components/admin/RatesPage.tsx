import { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus, Edit2, Trash2, Search, CreditCard, MoreVertical,
  X, ArrowUpDown, ChevronLeft, ChevronRight, Download,
  ToggleLeft, ToggleRight, TrendingUp, TrendingDown,
  Upload, RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { api, asPaginated } from "../../../lib/api";
import { catalogService } from "../../../services/catalog.service";
import type { GiftCardRate, GiftCardBrand, GiftCardProduct, AdminCountry } from "../../../types";

interface Brand {
  id: number;
  backendRateId?: string;
  backendBrandId?: string;
  backendProductId?: string | null;
  productName?: string | null;
  name: string;
  country: string;        // ISO alpha-2 code, e.g. "US"
  countryName?: string;   // display label, e.g. "United States"
  rate: number;
  prevRate: number;
  minValue: number;
  maxValue: number;
  status: "Active" | "Inactive";
  cardTypes: string[];
  lastUpdated: string;
  imageUrl: string;
}

type SortKey = "name" | "country" | "rate" | "minValue" | "maxValue" | "status";
type SortDir = "asc" | "desc";

const ITEMS_PER_PAGE = 8;

function BrandModal({
  mode,
  brand,
  availableBrands,
  availableCountries,
  availableProducts,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  brand?: Brand;
  availableBrands: GiftCardBrand[];
  availableCountries: AdminCountry[];
  availableProducts: GiftCardProduct[];
  onClose: () => void;
  onSave: (data: Omit<Brand, "id" | "prevRate" | "lastUpdated">) => void;
}) {
  // In edit mode the brand+country are immutable (Rate is keyed by them).
  const isEdit = mode === "edit";
  const initialBrand = brand ? availableBrands.find((b) => b.name === brand.name) : undefined;
  const [brandId, setBrandId] = useState<string>(brand?.backendBrandId ?? initialBrand?.id ?? "");
  const [country, setCountry] = useState(brand?.country ?? "");
  const [productId, setProductId] = useState<string>(brand?.backendProductId ?? "");
  const [rate, setRate] = useState(brand?.rate?.toString() || "");
  const [minValue, setMinValue] = useState(brand?.minValue ? String(brand.minValue) : "");
  const [maxValue, setMaxValue] = useState(brand?.maxValue ? String(brand.maxValue) : "");
  const [status, setStatus] = useState<"Active" | "Inactive">(brand?.status || "Active");
  const [cardTypes, setCardTypes] = useState<string[]>(brand?.cardTypes || ["E-Code"]);

  const selectedBrand = availableBrands.find((b) => b.id === brandId);
  // Constrain country choices to those the selected brand actually supports.
  const supported = selectedBrand?.supportedCountries ?? [];
  const countryOptions = availableCountries.filter(
    (c) => supported.length === 0 || supported.includes(c.code),
  );
  const selectedCountry = availableCountries.find((c) => c.code === country);

  // Products available for this brand+country (optional binding for the rate).
  const productOptions = availableProducts.filter(
    (p) => p.brandId === brandId && p.countryCode === country && p.isActive,
  );

  // Suggest min/max from the selected product so admin starts from sensible defaults.
  useEffect(() => {
    if (!productId) return;
    const p = availableProducts.find((x) => x.id === productId);
    if (!p) return;
    if (p.productType === "RANGE") {
      if (!minValue && p.minAmount != null) setMinValue(String(p.minAmount));
      if (!maxValue && p.maxAmount != null) setMaxValue(String(p.maxAmount));
    } else if (p.productType === "FIXED" && p.fixedAmounts.length > 0) {
      if (!minValue) setMinValue(String(Math.min(...p.fixedAmounts)));
      if (!maxValue) setMaxValue(String(Math.max(...p.fixedAmounts)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleSave = () => {
    if (!selectedBrand) { toast.error("Select a brand from the synced catalog"); return; }
    if (!country) { toast.error("Select a country"); return; }
    if (!rate || isNaN(Number(rate)) || Number(rate) <= 0) { toast.error("Valid rate is required"); return; }
    if (cardTypes.length === 0) { toast.error("Select at least one card type"); return; }
    const min = minValue === "" ? 0 : Number(minValue);
    const max = maxValue === "" ? 0 : Number(maxValue);
    if (minValue !== "" && (isNaN(min) || min < 0)) { toast.error("Min must be ≥ 0"); return; }
    if (maxValue !== "" && (isNaN(max) || max <= 0)) { toast.error("Max must be > 0"); return; }
    if (minValue !== "" && maxValue !== "" && max < min) { toast.error("Max must be ≥ Min"); return; }
    onSave({
      name: selectedBrand.name,
      country,
      countryName: selectedCountry?.name ?? country,
      backendProductId: productId || null,
      productName: availableProducts.find((p) => p.id === productId)?.productName ?? null,
      rate: Number(rate),
      minValue: min,
      maxValue: max,
      status,
      cardTypes,
      imageUrl: selectedBrand.logoUrl,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h3 className="text-[#272936]" style={{ fontSize: 18, fontWeight: 700 }}>{mode === "add" ? "Add Gift Card Brand" : "Edit Brand"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F5F7FB] flex items-center justify-center"><X className="w-5 h-5 text-[#6B7280]" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Brand *</label>
            <p className="text-[#9CA3AF] mb-2" style={{ fontSize: 12 }}>
              Pick a brand from the synced Reloadly catalog. Run a sync from the Catalog page if a brand is missing.
            </p>
            <select
              value={brandId}
              onChange={(e) => { setBrandId(e.target.value); setCountry(""); }}
              disabled={isEdit}
              className="w-full bg-[#F5F7FB] border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0159C7] disabled:opacity-60"
              style={{ fontSize: 14 }}
            >
              <option value="">Select a brand…</option>
              {availableBrands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {selectedBrand?.logoUrl && (
              <div className="mt-2 flex items-center gap-2">
                <ImageWithFallback src={selectedBrand.logoUrl} alt="" className="w-8 h-8 rounded-lg object-contain bg-white border border-border" />
                <span className="text-[#6B7280]" style={{ fontSize: 12 }}>{selectedBrand.category}</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Country *</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              disabled={isEdit || !selectedBrand}
              className="w-full bg-[#F5F7FB] border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0159C7] disabled:opacity-60"
              style={{ fontSize: 14 }}
            >
              <option value="">Select a country…</option>
              {countryOptions.map((c) => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
            {selectedBrand && countryOptions.length === 0 && (
              <p className="text-[#EF4444] mt-1" style={{ fontSize: 12 }}>
                No supported countries for this brand in the synced catalog yet.
              </p>
            )}
          </div>
          <div>
            <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Product (optional)</label>
            <p className="text-[#9CA3AF] mb-2" style={{ fontSize: 12 }}>
              Bind this rate to a specific product, or leave blank to apply it brand-wide for the selected country and card type.
            </p>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={!brandId || !country}
              className="w-full bg-[#F5F7FB] border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0159C7] disabled:opacity-60"
              style={{ fontSize: 14 }}
            >
              <option value="">— Brand-level rate —</option>
              {productOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.productName} · {p.productType} · {p.currency}
                </option>
              ))}
            </select>
            {/* Diagnostic feedback so admins can tell catalog-empty
                from filter-mismatch from "really no products". */}
            {availableProducts.length === 0 ? (
              <p className="text-[#F59E0B] mt-1" style={{ fontSize: 12 }}>
                Catalog not loaded — run a Reloadly sync from the Catalog page so products appear here.
              </p>
            ) : !brandId || !country ? (
              <p className="text-[#9CA3AF] mt-1" style={{ fontSize: 12 }}>
                Pick a brand and country to see matching products.
              </p>
            ) : productOptions.length === 0 ? (
              <p className="text-[#F59E0B] mt-1" style={{ fontSize: 12 }}>
                No catalog products for {selectedBrand?.name ?? "this brand"} in {country}. You can still save a brand-level rate.
              </p>
            ) : (
              <p className="text-[#22C55E] mt-1" style={{ fontSize: 12 }}>
                {productOptions.length} product{productOptions.length === 1 ? "" : "s"} available for this brand in {country}.
              </p>
            )}
          </div>
          <div>
            <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Rate (₦ per 1 unit of foreign currency) *</label>
            <p className="text-[#9CA3AF] mb-2" style={{ fontSize: 12 }}>
              The NGN payout per 1 unit of the brand&rsquo;s foreign currency. This is set manually — Reloadly never overwrites it.
            </p>
            <input
              type="number"
              min={1}
              className="w-full bg-[#F5F7FB] border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0159C7]"
              placeholder="e.g. 1450"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              style={{ fontSize: 14 }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Min amount</label>
              <input
                type="number"
                min={0}
                className="w-full bg-[#F5F7FB] border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0159C7]"
                placeholder="optional"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                style={{ fontSize: 14 }}
              />
            </div>
            <div>
              <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Max amount</label>
              <input
                type="number"
                min={0}
                className="w-full bg-[#F5F7FB] border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0159C7]"
                placeholder="optional"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
                style={{ fontSize: 14 }}
              />
            </div>
            <p className="col-span-2 text-[#9CA3AF] -mt-1" style={{ fontSize: 12 }}>
              Bounds on accepted card face value (foreign currency). Leave blank to inherit from the product/Reloadly catalog.
            </p>
          </div>
          <div>
            <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Card Type *</label>
            <p className="text-[#9CA3AF] mb-2" style={{ fontSize: 12 }}>
              A separate rate row is created per card type. Pick one when creating; ecode and physical may have different rates.
            </p>
            <div className="flex gap-2">
              {["Physical", "E-Code"].map((t) => (
                <button
                  key={t}
                  onClick={() => setCardTypes(cardTypes.includes(t) ? cardTypes.filter(x => x !== t) : isEdit ? [t] : [...cardTypes, t])}
                  disabled={isEdit && cardTypes[0] !== t && cardTypes.includes(t)}
                  className={`px-4 py-2 rounded-xl transition-colors ${cardTypes.includes(t) ? "bg-[#0159C7] text-white" : "bg-[#F5F7FB] text-[#6B7280] hover:bg-[#E8EBF0]"}`}
                  style={{ fontSize: 13, fontWeight: 500 }}
                >{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[#272936] mb-1.5" style={{ fontSize: 13, fontWeight: 600 }}>Status</label>
            <button onClick={() => setStatus(status === "Active" ? "Inactive" : "Active")} className="flex items-center gap-2">
              {status === "Active" ? <ToggleRight className="w-8 h-8 text-[#22C55E]" /> : <ToggleLeft className="w-8 h-8 text-[#9CA3AF]" />}
              <span className={status === "Active" ? "text-[#22C55E]" : "text-[#9CA3AF]"} style={{ fontSize: 13, fontWeight: 600 }}>{status}</span>
            </button>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-[#6B7280] hover:bg-[#F5F7FB]" style={{ fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-[#0159C7] text-white rounded-xl hover:bg-[#014BA8]" style={{ fontSize: 14, fontWeight: 600 }}>{mode === "add" ? "Add Brand" : "Save Changes"}</button>
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

export function RatesPage() {
  const { hasPermission } = useAdminAuth();
  const canEditRates = hasPermission("rates.edit");
  const canDeleteRates = hasPermission("rates.delete");
  const canManageRates = canEditRates || canDeleteRates;

  const [brands, setBrands] = useState<Brand[]>([]);
  const [availableBrands, setAvailableBrands] = useState<GiftCardBrand[]>([]);
  const [availableCountries, setAvailableCountries] = useState<AdminCountry[]>([]);
  const [availableProducts, setAvailableProducts] = useState<GiftCardProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true); // controls initial skeleton
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [showModal, setShowModal] = useState<{ mode: "add" | "edit"; brand?: Brand } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; confirmLabel: string; confirmColor: string; onConfirm: () => void } | null>(null);

  const actionMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) setActionMenu(null); };
    if (actionMenu !== null) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [actionMenu]);

  const filtered = useMemo(() => {
    let list = brands.filter((b) => {
      const q = search.toLowerCase();
      const matchSearch = !q || b.name.toLowerCase().includes(q) || b.country.toLowerCase().includes(q);
      const matchCountry = countryFilter === "All" || b.country === countryFilter;
      const matchStatus = statusFilter === "All" || b.status === statusFilter;
      return matchSearch && matchCountry && matchStatus;
    });
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "country": cmp = a.country.localeCompare(b.country); break;
        case "rate": cmp = a.rate - b.rate; break;
        case "minValue": cmp = a.minValue - b.minValue; break;
        case "maxValue": cmp = a.maxValue - b.maxValue; break;
        case "status": cmp = a.status.localeCompare(b.status); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [brands, search, countryFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, countryFilter, statusFilter, sortKey, sortDir]);

  // Load brands + rates from backend on mount
  useEffect(() => {
    let cancelled = false;
    // Tolerate either {success,data:[...]} or {success,data:{data:[...]}}
    // by normalizing every paginated response through `asPaginated`.
    // Use the same catalogService calls the (working) Catalog page uses for
    // brands/countries/products so any path difference is eliminated. Each
    // call is independent — if one fails we still want the others to populate
    // their dropdowns, so they're awaited individually with allSettled.
    Promise.allSettled([
      api.get<unknown>("/admin/rates?limit=2000&page=1"),
      catalogService.listBrands(1, 2000),
      catalogService.listCountries(1, 500),
      catalogService.listProducts({ page: 1, limit: 2000 }),
    ])
      .then(([ratesS, brandsS, countriesS, productsS]) => {
        if (cancelled) return;

        const ratesRes  = ratesS.status     === "fulfilled" ? asPaginated<GiftCardRate>(ratesS.value)        : { data: [] as GiftCardRate[], meta: { total: 0, page: 1, limit: 0, pages: 1 } };
        const brandsRes = brandsS.status    === "fulfilled" ? brandsS.value                                    : { data: [] as GiftCardBrand[], meta: { total: 0, page: 1, limit: 0, pages: 1 } };
        const countriesRes = countriesS.status === "fulfilled" ? countriesS.value                              : { data: [] as AdminCountry[], meta: { total: 0, page: 1, limit: 0, pages: 1 } };
        const productsRes = productsS.status   === "fulfilled" ? productsS.value                               : { data: [] as GiftCardProduct[], meta: { total: 0, page: 1, limit: 0, pages: 1 } };

        if (ratesS.status === "rejected") console.error("[Rates] /admin/rates failed:", ratesS.reason);
        if (brandsS.status === "rejected") console.error("[Rates] /admin/brands failed:", brandsS.reason);
        if (countriesS.status === "rejected") console.error("[Rates] /admin/countries failed:", countriesS.reason);
        if (productsS.status === "rejected") console.error("[Rates] /admin/products failed:", productsS.reason);

        // Diagnostic so we can verify in the browser console exactly what
        // arrived. Remove once the page is confirmed stable.
        // eslint-disable-next-line no-console
        console.info("[Rates] catalog loaded:", {
          rates: ratesRes.data.length,
          brands: brandsRes.data.length,
          countries: countriesRes.data.length,
          products: productsRes.data.length,
          sampleProduct: productsRes.data[0],
        });

        // Only allow rate creation against brands/countries that are active in
        // the synced Reloadly catalog. Reloadly is reference-only — admin owns rates.
        setAvailableBrands(brandsRes.data.filter((b) => b.isActive));
        setAvailableCountries(
          countriesRes.data
            .filter((c) => c.isActive)
            .map((c): AdminCountry => ({
              code: c.code,
              name: c.name,
              isActive: c.isActive,
              activeBrandsCount: ('activeBrandsCount' in c ? (c as AdminCountry).activeBrandsCount : 0),
            })),
        );
        setAvailableProducts(productsRes.data);
        const mapped: Brand[] = ratesRes.data.map((r, idx) => ({
          id: idx + 1,
          backendRateId: r.id,
          backendBrandId: r.brandId,
          backendProductId: r.productId ?? null,
          productName: r.product?.productName ?? null,
          name: r.brand.name,
          country: r.countryCode,
          rate: r.ratePerUnit,
          prevRate: r.ratePerUnit,
          minValue: r.minAmount ?? 0,
          maxValue: r.maxAmount ?? 0,
          status: r.isActive ? "Active" : "Inactive",
          cardTypes: [r.cardType === "ecode" ? "E-Code" : "Physical"],
          lastUpdated: new Date(r.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          imageUrl: r.brand.logoUrl || "",
        }));
        setBrands(mapped);
      })
      .catch((err: Error) => toast.error(err.message || "Failed to load rates"))
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const addBrand = (data: Omit<Brand, "id" | "prevRate" | "lastUpdated">) => {
    // Find the matching backend brand by name so we have the brandId
    const matchedBrand = availableBrands.find(
      (b) => b.name.toLowerCase() === data.name.toLowerCase()
    );
    if (!matchedBrand) {
      toast.error(
        `${data.name} was not found in Reloadly catalog for ${data.country} after sync.`,
      );
      return;
    }
    const cardType = data.cardTypes[0] === "E-Code" ? "ecode" : "physical";
    setIsSaving(true);
    api.post<GiftCardRate>("/admin/rates", {
      brandId: matchedBrand.id,
      productId: data.backendProductId || null,
      countryCode: data.country,
      cardType,
      ratePerUnit: data.rate,
      minAmount: data.minValue > 0 ? data.minValue : null,
      maxAmount: data.maxValue > 0 ? data.maxValue : null,
      isActive: data.status === "Active",
    })
      .then((created) => {
        const newBrand: Brand = {
          ...data,
          id: Date.now(),
          backendRateId: created.id,
          backendBrandId: created.brandId,
          prevRate: data.rate,
          lastUpdated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        };
        setBrands((prev) => [newBrand, ...prev]);
        toast.success(`${data.name} (${data.country}) rate created`);
        setShowModal(null);
      })
      .catch((err: Error) => toast.error(err.message || "Failed to create rate"))
      .finally(() => setIsSaving(false));
  };

  const editBrand = (id: number, data: Omit<Brand, "id" | "prevRate" | "lastUpdated">) => {
    const brand = brands.find((b) => b.id === id);
    setIsSaving(true);
    const patchFn = brand?.backendRateId
      ? api.put(`/admin/rates/${brand.backendRateId}`, {
          ratePerUnit: data.rate,
          isActive: data.status === "Active",
          productId: data.backendProductId || null,
          minAmount: data.minValue > 0 ? data.minValue : null,
          maxAmount: data.maxValue > 0 ? data.maxValue : null,
        })
      : Promise.reject(new Error("No rate ID"));
    patchFn
      .then(() => {
        setBrands((prev) => prev.map((b) => b.id === id ? { ...b, ...data, prevRate: b.rate, lastUpdated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } : b));
        toast.success(`${data.name} (${data.country}) updated`);
        setShowModal(null);
      })
      .catch(() => toast.error("Failed to update rate"))
      .finally(() => setIsSaving(false));
  };

  const deleteBrand = (id: number) => {
    const b = brands.find((x) => x.id === id);
    if (!b?.backendRateId) return;
    api.delete(`/admin/rates/${b.backendRateId}`)
      .then(() => {
        setBrands((prev) => prev.filter((x) => x.id !== id));
        toast.success(`${b.name} (${b.country}) deleted`);
      })
      .catch(() => toast.error("Failed to delete rate"))
      .finally(() => setConfirmModal(null));
  };

  const toggleStatus = (id: number) => {
    const b = brands.find((x) => x.id === id);
    if (!b?.backendRateId) return;
    const newActive = b.status !== "Active";
    api.put(`/admin/rates/${b.backendRateId}`, { isActive: newActive })
      .then(() => {
        setBrands((prev) => prev.map((x) => x.id === id ? { ...x, status: newActive ? "Active" : "Inactive" } : x));
        toast.success(`${b.name} ${newActive ? "activated" : "deactivated"}`);
      })
      .catch(() => toast.error("Failed to update status"));
  };

  const exportCSV = () => {
    const header = "Brand,Country,Rate,Min Value,Max Value,Status,Card Types,Last Updated\n";
    const rows = filtered.map((b) => `"${b.name}","${b.country}","₦${b.rate}","$${b.minValue}","$${b.maxValue}","${b.status}","${b.cardTypes.join(", ")}","${b.lastUpdated}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cardcentrals-rates.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Rates exported to CSV");
  };

  const activeCount = brands.filter((b) => b.status === "Active").length;

  const SortIcon = ({ col }: { col: SortKey }) => (
    <ArrowUpDown className={`w-3.5 h-3.5 inline-block ml-1 ${sortKey === col ? "text-[#0159C7]" : "text-[#9CA3AF]"}`} />
  );

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[#272936]" style={{ fontSize: 24, fontWeight: 700 }}>Rates Management</h1>
          <p className="text-[#6B7280]" style={{ fontSize: 14 }}>
            Manage gift card brands and exchange rates · {filtered.length} brands
            {isSaving && <span className="ml-2 text-[#0159C7]">· Syncing...</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-[#6B7280] hover:bg-[#F5F7FB]" style={{ fontSize: 13, fontWeight: 500 }}><Download className="w-4 h-4" /> Export</button>
          {canManageRates && <button onClick={() => setShowModal({ mode: "add" })} className="flex items-center gap-2 px-5 py-2.5 bg-[#0159C7] text-white rounded-xl hover:bg-[#014BA8] transition-colors" style={{ fontSize: 14, fontWeight: 600 }}><Plus className="w-4 h-4" /> Add Brand</button>}
        </div>
      </div>

      {/* Stats — left column reflects configured admin rates,
          right column reflects the underlying Reloadly catalog. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-border">
          <div className="text-[#272936]" style={{ fontSize: 26, fontWeight: 700 }}>{brands.length}</div>
          <div className="text-[#6B7280]" style={{ fontSize: 13 }}>Configured Rates</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-border">
          <div className="text-[#22C55E]" style={{ fontSize: 26, fontWeight: 700 }}>{activeCount}</div>
          <div className="text-[#6B7280]" style={{ fontSize: 13 }}>Active Rates</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-border">
          <div className="text-[#0159C7]" style={{ fontSize: 26, fontWeight: 700 }}>{availableBrands.length}</div>
          <div className="text-[#6B7280]" style={{ fontSize: 13 }}>Catalog Brands</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-border">
          <div className="text-[#272936]" style={{ fontSize: 26, fontWeight: 700 }}>{availableCountries.length}</div>
          <div className="text-[#6B7280]" style={{ fontSize: 13 }}>Catalog Countries</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border">
        <div className="p-5 border-b border-border space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 bg-[#F5F7FB] rounded-xl px-4 py-2 flex-1">
              <Search className="w-4 h-4 text-[#6B7280]" />
              <input type="text" placeholder="Search brands or countries..." className="bg-transparent border-none outline-none text-[#272936] w-full" value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontSize: 14 }} />
              {search && <button onClick={() => setSearch("")}><X className="w-4 h-4 text-[#9CA3AF] hover:text-[#272936]" /></button>}
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-4 py-2 border border-border rounded-xl text-[#6B7280] bg-white" style={{ fontSize: 13 }}>
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {(["All", ...Array.from(new Set(brands.map((b) => b.country))).sort()] as string[]).map((c) => (
              <button key={c} onClick={() => setCountryFilter(c)} className={`px-4 py-1.5 rounded-lg whitespace-nowrap transition-colors ${countryFilter === c ? "bg-[#0159C7] text-white" : "bg-[#F5F7FB] text-[#6B7280] hover:text-[#272936]"}`} style={{ fontSize: 13, fontWeight: 500 }}>
                {c}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full ${countryFilter === c ? "bg-white/20" : "bg-[#E8EBF0]"}`} style={{ fontSize: 11, fontWeight: 600 }}>
                  {c === "All" ? brands.length : brands.filter((b) => b.country === c).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F5F7FB]">
                {([
                  { key: "name" as SortKey, label: "BRAND" },
                  { key: "country" as SortKey, label: "COUNTRY" },
                  { key: "rate" as SortKey, label: "RATE (₦/$)" },
                  { key: null, label: "CHANGE" },
                  { key: "minValue" as SortKey, label: "MIN" },
                  { key: "maxValue" as SortKey, label: "MAX" },
                  { key: null, label: "TYPES" },
                  { key: "status" as SortKey, label: "STATUS" },
                  ...(canManageRates ? [{ key: null, label: "ACTIONS" }] : []),
                ] as const).map((col) => (
                  <th key={col.label} className={`text-left px-5 py-3 text-[#6B7280] ${col.key ? "cursor-pointer hover:text-[#272936] select-none" : ""}`} style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em" }} onClick={() => col.key && toggleSort(col.key)}>
                    {col.label}{col.key && <SortIcon col={col.key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={9} className="text-center py-16 text-[#6B7280]" style={{ fontSize: 14 }}>Loading rates...</td></tr>
              )}
              {!isLoading && paginated.length === 0 && (
                <tr><td colSpan={9} className="text-center py-16 text-[#6B7280]" style={{ fontSize: 14 }}>
                  {brands.length === 0
                    ? availableBrands.length === 0
                      ? "No catalog brands found. Run a Reloadly sync from the Catalog page to populate the catalog, then create rates here."
                      : "No rates configured yet. Click “Add Brand” to create the first admin rate."
                    : "No rates match your criteria."}
                </td></tr>
              )}
              {paginated.map((b) => {
                const diff = b.rate - b.prevRate;
                return (
                  <tr key={b.id} className="border-t border-border hover:bg-[#F5F7FB]/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {b.imageUrl ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-border bg-white shrink-0">
                            <ImageWithFallback src={b.imageUrl} alt={b.name} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-[#0159C7]/10 rounded-lg flex items-center justify-center shrink-0">
                            <CreditCard className="w-4 h-4 text-[#0159C7]" />
                          </div>
                        )}
                        <div>
                          <span className="text-[#272936]" style={{ fontSize: 14, fontWeight: 500 }}>{b.name}</span>
                          <div className="text-[#9CA3AF]" style={{ fontSize: 11 }}>
                            {b.productName ? `${b.productName} · ` : "Brand-level · "}Updated {b.lastUpdated}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[#6B7280]" style={{ fontSize: 13 }}>{b.country}</td>
                    <td className="px-5 py-4 text-[#0159C7]" style={{ fontSize: 14, fontWeight: 700 }}>₦{b.rate}</td>
                    <td className="px-5 py-4">
                      {diff !== 0 ? (
                        <span className={`inline-flex items-center gap-0.5 ${diff > 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`} style={{ fontSize: 12, fontWeight: 600 }}>
                          {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {diff > 0 ? "+" : ""}{diff}
                        </span>
                      ) : <span className="text-[#9CA3AF]" style={{ fontSize: 12 }}>—</span>}
                    </td>
                    <td className="px-5 py-4 text-[#272936]" style={{ fontSize: 13 }}>${b.minValue}</td>
                    <td className="px-5 py-4 text-[#272936]" style={{ fontSize: 13 }}>${b.maxValue}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        {b.cardTypes.map((t) => (
                          <span key={t} className="px-2 py-0.5 bg-[#F5F7FB] text-[#6B7280] rounded-md" style={{ fontSize: 11, fontWeight: 500 }}>{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full ${b.status === "Active" ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#6B7280]/10 text-[#6B7280]"}`} style={{ fontSize: 12, fontWeight: 600 }}>{b.status}</span>
                    </td>
                    {canManageRates && (
                      <td className="px-5 py-4">
                        <div className="relative" ref={actionMenu === b.id ? actionMenuRef : undefined}>
                          <button onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === b.id ? null : b.id); }} className="p-1.5 hover:bg-[#F5F7FB] rounded-lg"><MoreVertical className="w-4 h-4 text-[#6B7280]" /></button>
                          <AnimatePresence>
                            {actionMenu === b.id && (
                              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-border py-1.5 w-48 z-20">
                                {canEditRates && <button onClick={() => { setShowModal({ mode: "edit", brand: b }); setActionMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#272936] hover:bg-[#F5F7FB]" style={{ fontSize: 13 }}><Edit2 className="w-4 h-4 text-[#6B7280]" /> Edit Brand</button>}
                                {canEditRates && <button onClick={() => { toggleStatus(b.id); setActionMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#272936] hover:bg-[#F5F7FB]" style={{ fontSize: 13 }}>
                                  {b.status === "Active" ? <ToggleLeft className="w-4 h-4 text-[#F59E0B]" /> : <ToggleRight className="w-4 h-4 text-[#22C55E]" />}
                                  {b.status === "Active" ? "Deactivate" : "Activate"}
                                </button>}
                                {canEditRates && <div className="mx-3 my-1 border-t border-border" />}
                                {canDeleteRates && <button onClick={() => { setConfirmModal({ title: "Delete Brand", message: `Permanently delete ${b.name} (${b.country})? This cannot be undone.`, confirmLabel: "Delete", confirmColor: "#EF4444", onConfirm: () => deleteBrand(b.id) }); setActionMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#EF4444] hover:bg-[#EF4444]/5" style={{ fontSize: 13 }}><Trash2 className="w-4 h-4" /> Delete Brand</button>}
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
        {showModal && (
          <BrandModal
            key="brand-modal"
            mode={showModal.mode}
            brand={showModal.brand}
            availableBrands={availableBrands}
            availableCountries={availableCountries}
            availableProducts={availableProducts}
            onClose={() => setShowModal(null)}
            onSave={(data) => showModal.mode === "add" ? addBrand(data) : editBrand(showModal.brand!.id, data)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {confirmModal && <ConfirmModal key="confirm" {...confirmModal} onClose={() => setConfirmModal(null)} />}
      </AnimatePresence>
    </div>
  );
}