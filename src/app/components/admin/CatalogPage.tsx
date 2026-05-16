import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Search,
  ToggleLeft,
  ToggleRight,
  Package,
  Tags,
  Clock,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { catalogService } from "../../../services";
import type {
  GiftCardBrand,
  GiftCardProduct,
  ReloadlySyncStatusResponse,
} from "../../../types";

type Tab = "brands" | "products";

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error && e.message ? e.message : fallback;

export function CatalogPage() {
  const { hasPermission } = useAdminAuth();
  const canEdit = hasPermission("rates.edit");

  // ── Sync state ──────────────────────────────────────────────────────────
  const [syncStatus, setSyncStatus] = useState<ReloadlySyncStatusResponse | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // ── Tabs / data ────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>("brands");

  const [brands, setBrands] = useState<GiftCardBrand[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [brandsError, setBrandsError] = useState<string | null>(null);

  const [products, setProducts] = useState<GiftCardProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Filters ─────────────────────────────────────────────────────────────
  const [brandSearch, setBrandSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productBrandFilter, setProductBrandFilter] = useState<string>("");
  const [productCountryFilter, setProductCountryFilter] = useState<string>("");

  // ── Loaders ─────────────────────────────────────────────────────────────
  const loadStatus = () =>
    catalogService
      .getSyncStatus()
      .then(setSyncStatus)
      .catch((err) => {
        console.error("[Catalog] sync status load failed:", err);
      });

  const loadBrands = () => {
    setIsLoadingBrands(true);
    setBrandsError(null);
    catalogService
      .listBrands(1, 1000)
      .then((res) => setBrands(res.data))
      .catch((err) => {
        console.error("[Catalog] brands load failed:", err);
        const msg = errMsg(err, "Failed to load brands");
        setBrandsError(msg);
        toast.error(msg);
      })
      .finally(() => setIsLoadingBrands(false));
  };

  const loadProducts = () => {
    setIsLoadingProducts(true);
    setProductsError(null);
    catalogService
      .listProducts({
        limit: 2000,
        ...(productBrandFilter && { brandId: productBrandFilter }),
        ...(productCountryFilter && { countryCode: productCountryFilter }),
      })
      .then((res) => setProducts(res.data))
      .catch((err) => {
        console.error("[Catalog] products load failed:", err);
        const msg = errMsg(err, "Failed to load products");
        setProductsError(msg);
        toast.error(msg);
      })
      .finally(() => setIsLoadingProducts(false));
  };

  useEffect(() => {
    loadStatus();
    loadBrands();
  }, []);

  useEffect(() => {
    if (tab === "products") loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, productBrandFilter, productCountryFilter]);

  // ── Sync ────────────────────────────────────────────────────────────────
  const runSync = async () => {
    if (!canEdit || isSyncing) return;
    setIsSyncing(true);
    toast.info("Reloadly catalog sync started — this can take a minute.");
    try {
      const result = await catalogService.syncReloadly();
      toast.success(
        `Sync complete: ${result.brandsUpserted} brands · ${result.productsUpserted} products · ${result.countriesProcessed} countries`,
      );
      await Promise.all([
        loadStatus(),
        loadBrands(),
        tab === "products" ? loadProducts() : Promise.resolve(),
      ]);
    } catch (err) {
      console.error("[Catalog] sync failed:", err);
      toast.error(errMsg(err, "Sync failed"));
      loadStatus();
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Visibility toggles ─────────────────────────────────────────────────
  const toggleBrand = async (brand: GiftCardBrand) => {
    if (!canEdit) return;
    setTogglingId(brand.id);
    try {
      await catalogService.setBrandVisibility(brand.id, !brand.isActive);
      setBrands((prev) =>
        prev.map((b) => (b.id === brand.id ? { ...b, isActive: !brand.isActive } : b)),
      );
      toast.success(`${brand.name} ${!brand.isActive ? "shown" : "hidden"}`);
    } catch (err) {
      console.error("[Catalog] brand toggle failed:", err);
      toast.error(errMsg(err, "Failed to update brand visibility"));
    } finally {
      setTogglingId(null);
    }
  };

  const toggleProduct = async (product: GiftCardProduct) => {
    if (!canEdit) return;
    setTogglingId(product.id);
    try {
      await catalogService.setProductVisibility(product.id, !product.isActive);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isActive: !product.isActive } : p)),
      );
      toast.success(`${product.productName} ${!product.isActive ? "shown" : "hidden"}`);
    } catch (err) {
      console.error("[Catalog] product toggle failed:", err);
      toast.error(errMsg(err, "Failed to update product visibility"));
    } finally {
      setTogglingId(null);
    }
  };

  // ── Filtered lists ─────────────────────────────────────────────────────
  const filteredBrands = useMemo(() => {
    const q = brandSearch.toLowerCase();
    return brands.filter(
      (b) => !q || b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q),
    );
  }, [brands, brandSearch]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        !q ||
        p.productName.toLowerCase().includes(q) ||
        p.countryCode.toLowerCase().includes(q),
    );
  }, [products, productSearch]);

  // ── Sync status pill ───────────────────────────────────────────────────
  const lastRun = syncStatus?.lastRun;
  const lastSyncedAt = syncStatus?.lastSyncedAt
    ? new Date(syncStatus.lastSyncedAt).toLocaleString()
    : "never";

  return (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[#272936]" style={{ fontSize: 24, fontWeight: 700 }}>
            Catalog Management
          </h1>
          <p className="text-[#6B7280]" style={{ fontSize: 14 }}>
            Sync the Reloadly catalog and control brand/product visibility.
            Country visibility lives in the dedicated <strong>Countries</strong> page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runSync}
            disabled={!canEdit || isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-[#0159C7] text-white rounded-xl hover:bg-[#0149A7] transition-colors disabled:opacity-50"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing…" : "Run Reloadly Sync"}
          </button>
        </div>
      </div>

      {/* Sync status card */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            {lastRun?.status === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
            ) : lastRun?.status === "failed" ? (
              <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
            ) : (
              <Clock className="w-5 h-5 text-[#9CA3AF]" />
            )}
            <div>
              <div className="text-[#6B7280]" style={{ fontSize: 12, fontWeight: 500 }}>
                Last sync
              </div>
              <div className="text-[#272936]" style={{ fontSize: 14, fontWeight: 600 }}>
                {lastSyncedAt}
              </div>
            </div>
          </div>

          <div className="h-10 w-px bg-border" />

          <div>
            <div className="text-[#6B7280]" style={{ fontSize: 12, fontWeight: 500 }}>
              Status
            </div>
            <div
              className="capitalize"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color:
                  lastRun?.status === "success"
                    ? "#22C55E"
                    : lastRun?.status === "failed"
                      ? "#EF4444"
                      : "#6B7280",
              }}
            >
              {lastRun?.status ?? "no runs yet"}
            </div>
          </div>

          {lastRun && (
            <>
              <div className="h-10 w-px bg-border" />
              <div>
                <div className="text-[#6B7280]" style={{ fontSize: 12, fontWeight: 500 }}>
                  Result
                </div>
                <div className="text-[#272936]" style={{ fontSize: 13, fontWeight: 500 }}>
                  {lastRun.brandsUpserted} brands · {lastRun.productsUpserted} products ·{" "}
                  {lastRun.countriesProcessed} countries
                  {lastRun.countriesFailed > 0 && (
                    <span className="ml-1 text-[#EF4444]">
                      ({lastRun.countriesFailed} failed)
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="ml-auto flex flex-col items-end">
            <div className="text-[#6B7280]" style={{ fontSize: 12 }}>
              Reloadly base URL
            </div>
            <code className="text-[#272936]" style={{ fontSize: 12 }}>
              {syncStatus?.baseUrl ?? "—"}
            </code>
          </div>
        </div>

        {lastRun?.errorMessage && (
          <div className="mt-3 p-3 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B]" style={{ fontSize: 12 }}>
            <strong>Last error:</strong> {lastRun.errorMessage}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(
          [
            { key: "brands", label: "Brands", icon: Tags },
            { key: "products", label: "Products", icon: Package },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-[#0159C7] text-[#0159C7]"
                : "border-transparent text-[#6B7280] hover:text-[#272936]"
            }`}
            style={{ fontSize: 14, fontWeight: 600 }}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.key === "brands" && brands.length > 0 && (
              <span className="ml-1 text-[#9CA3AF]" style={{ fontSize: 12, fontWeight: 500 }}>
                ({brands.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Brands tab */}
      {tab === "brands" && (
        <div className="bg-white border border-border rounded-2xl">
          <div className="px-5 py-4 border-b border-border">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                className="w-full pl-9 pr-4 py-2 bg-[#F5F7FB] border border-border rounded-xl outline-none focus:ring-2 focus:ring-[#0159C7] focus:border-transparent"
                placeholder="Search brands…"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                style={{ fontSize: 14 }}
              />
            </div>
          </div>
          {isLoadingBrands ? (
            <div className="py-20 flex flex-col items-center gap-3 text-[#6B7280]">
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "#0159C7" }} />
              <span style={{ fontSize: 14 }}>Loading brands…</span>
            </div>
          ) : brandsError ? (
            <div className="py-12 text-center text-[#EF4444]" style={{ fontSize: 14 }}>
              <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">Failed to load brands</div>
              <div className="text-[#991B1B] mt-1" style={{ fontSize: 12 }}>{brandsError}</div>
              <button
                onClick={loadBrands}
                className="mt-3 px-3 py-1.5 bg-[#FEE2E2] text-[#991B1B] rounded-lg"
                style={{ fontSize: 12, fontWeight: 600 }}
              >
                Retry
              </button>
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="py-20 text-center text-[#6B7280]" style={{ fontSize: 14 }}>
              No brands. Run a Reloadly sync to populate the catalog.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredBrands.map((brand) => (
                <div
                  key={brand.id}
                  className="grid items-center px-5 py-3 gap-4 hover:bg-[#F5F7FB] transition-colors"
                  style={{ gridTemplateColumns: "3rem 1fr 8rem 8rem 7rem" }}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#F5F7FB] flex items-center justify-center">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Tags className="w-5 h-5 text-[#9CA3AF]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[#272936] truncate" style={{ fontSize: 14, fontWeight: 600 }}>
                      {brand.name}
                    </div>
                    <div className="text-[#6B7280] truncate" style={{ fontSize: 12 }}>
                      {brand.category} · {brand.supportedCountries.length} countries
                    </div>
                  </div>
                  <div className="text-[#6B7280]" style={{ fontSize: 12 }}>
                    {brand._count?.products ?? 0} products
                  </div>
                  <div className="text-[#6B7280]" style={{ fontSize: 12 }}>
                    {brand._count?.rates ?? 0} rates
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        fontSize: 11,
                        backgroundColor: brand.isActive ? "#DCFCE7" : "#FEE2E2",
                        color: brand.isActive ? "#22C55E" : "#EF4444",
                      }}
                    >
                      {brand.isActive ? "Visible" : "Hidden"}
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => toggleBrand(brand)}
                        disabled={togglingId === brand.id}
                        className="w-8 h-8 rounded-lg hover:bg-[#E8EBF0] flex items-center justify-center disabled:opacity-50"
                        title={brand.isActive ? "Hide brand" : "Show brand"}
                      >
                        {togglingId === brand.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-[#9CA3AF]" />
                        ) : brand.isActive ? (
                          <ToggleRight className="w-5 h-5 text-[#22C55E]" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-[#9CA3AF]" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Products tab */}
      {tab === "products" && (
        <div className="bg-white border border-border rounded-2xl">
          <div className="flex flex-col sm:flex-row gap-3 px-5 py-4 border-b border-border">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                className="w-full pl-9 pr-4 py-2 bg-[#F5F7FB] border border-border rounded-xl outline-none focus:ring-2 focus:ring-[#0159C7] focus:border-transparent"
                placeholder="Search products…"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                style={{ fontSize: 14 }}
              />
            </div>
            <select
              value={productBrandFilter}
              onChange={(e) => setProductBrandFilter(e.target.value)}
              className="px-3 py-2 bg-[#F5F7FB] border border-border rounded-xl outline-none"
              style={{ fontSize: 13 }}
            >
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <input
              className="w-28 px-3 py-2 bg-[#F5F7FB] border border-border rounded-xl outline-none uppercase"
              placeholder="Country"
              maxLength={2}
              value={productCountryFilter}
              onChange={(e) => setProductCountryFilter(e.target.value.toUpperCase())}
              style={{ fontSize: 13 }}
            />
          </div>
          {isLoadingProducts ? (
            <div className="py-20 flex flex-col items-center gap-3 text-[#6B7280]">
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "#0159C7" }} />
              <span style={{ fontSize: 14 }}>Loading products…</span>
            </div>
          ) : productsError ? (
            <div className="py-12 text-center text-[#EF4444]" style={{ fontSize: 14 }}>
              <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">Failed to load products</div>
              <div className="text-[#991B1B] mt-1" style={{ fontSize: 12 }}>{productsError}</div>
              <button
                onClick={loadProducts}
                className="mt-3 px-3 py-1.5 bg-[#FEE2E2] text-[#991B1B] rounded-lg"
                style={{ fontSize: 12, fontWeight: 600 }}
              >
                Retry
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center text-[#6B7280]" style={{ fontSize: 14 }}>
              No products match the current filter.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className="grid items-center px-5 py-3 gap-4 hover:bg-[#F5F7FB] transition-colors"
                  style={{ gridTemplateColumns: "3rem 1fr 5rem 6rem 1fr 7rem" }}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#F5F7FB] flex items-center justify-center">
                    {p.logoUrl || p.brand?.logoUrl ? (
                      <img src={p.logoUrl ?? p.brand?.logoUrl ?? ""} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-[#9CA3AF]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[#272936] truncate" style={{ fontSize: 14, fontWeight: 600 }}>
                      {p.productName}
                    </div>
                    <div className="text-[#6B7280] truncate" style={{ fontSize: 12 }}>
                      {p.brand?.name ?? "—"}
                    </div>
                  </div>
                  <span
                    className="font-mono text-[#6B7280] bg-[#F5F7FB] rounded-lg px-2 py-0.5 w-fit"
                    style={{ fontSize: 12 }}
                  >
                    {p.countryCode}
                  </span>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>{p.currency}</span>
                  <span className="text-[#6B7280] truncate" style={{ fontSize: 12 }}>
                    {p.productType === "FIXED"
                      ? p.fixedAmounts.length
                        ? `Fixed: ${p.fixedAmounts.slice(0, 4).join(", ")}${p.fixedAmounts.length > 4 ? "…" : ""}`
                        : "Fixed"
                      : `Range: ${p.minAmount ?? "?"}–${p.maxAmount ?? "?"}`}
                  </span>
                  <div className="flex items-center justify-end gap-2">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        fontSize: 11,
                        backgroundColor: p.isActive ? "#DCFCE7" : "#FEE2E2",
                        color: p.isActive ? "#22C55E" : "#EF4444",
                      }}
                    >
                      {p.isActive ? "Visible" : "Hidden"}
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => toggleProduct(p)}
                        disabled={togglingId === p.id}
                        className="w-8 h-8 rounded-lg hover:bg-[#E8EBF0] flex items-center justify-center disabled:opacity-50"
                        title={p.isActive ? "Hide product" : "Show product"}
                      >
                        {togglingId === p.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-[#9CA3AF]" />
                        ) : p.isActive ? (
                          <ToggleRight className="w-5 h-5 text-[#22C55E]" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-[#9CA3AF]" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!canEdit && (
        <div className="flex items-center gap-2 px-4 py-3 bg-[#FFF8F0] border border-[#F59E0B]/30 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
          <span className="text-[#92400E]" style={{ fontSize: 13 }}>
            View-only access. Only Super Admin and Admin roles can run sync or change visibility.
          </span>
        </div>
      )}
    </div>
  );
}
