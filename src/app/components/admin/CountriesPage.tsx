import { useState, useEffect, useMemo } from "react";
import {
  Globe, Search, RefreshCw, X, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight, Download,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { api } from "../../../lib/api";
import type { AdminCountry, PaginatedResponse } from "../../../types";

const ITEMS_PER_PAGE = 20;

// ISO 3166-1 alpha-2 → flag emoji
function countryFlag(code: string): string {
  const offset = 127397;
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + offset))
    .join("");
}

export function CountriesPage() {
  const { hasPermission } = useAdminAuth();
  const canEdit = hasPermission("rates.edit");

  const [countries, setCountries] = useState<AdminCountry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const load = () => {
    setIsLoading(true);
    api.get<PaginatedResponse<AdminCountry>>("/admin/countries?limit=500&page=1")
      .then((res) => setCountries(res.data))
      .catch(() => toast.error("Failed to load countries"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ── Toggle active/inactive ─────────────────────────────────────────────────

  const toggleCountry = async (code: string, currentlyActive: boolean) => {
    if (!canEdit) return;
    setToggling((prev) => new Set(prev).add(code));
    try {
      await api.patch(`/admin/countries/${code}/status`, { isActive: !currentlyActive });
      setCountries((prev) =>
        prev.map((c) => c.code === code ? { ...c, isActive: !currentlyActive } : c)
      );
      toast.success(`${code} ${!currentlyActive ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Failed to update country status");
    } finally {
      setToggling((prev) => { const n = new Set(prev); n.delete(code); return n; });
    }
  };

  // ── Filter / paginate ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return countries.filter((c) => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
      const matchFilter =
        filterActive === "all" ||
        (filterActive === "active" && c.isActive) ||
        (filterActive === "inactive" && !c.isActive);
      return matchSearch && matchFilter;
    });
  }, [countries, search, filterActive]);

  useEffect(() => { setPage(1); }, [search, filterActive]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const activeCount = countries.filter((c) => c.isActive).length;
  const inactiveCount = countries.length - activeCount;

  // ── CSV export ─────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const header = "Code,Name,Status,Active Brands\n";
    const rows = filtered
      .map((c) => `"${c.code}","${c.name}","${c.isActive ? "Active" : "Inactive"}","${c.activeBrandsCount}"`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cardcentrals-countries.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Countries exported to CSV");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[#272936]" style={{ fontSize: 24, fontWeight: 700 }}>
            Countries Management
          </h1>
          <p className="text-[#6B7280]" style={{ fontSize: 14 }}>
            Control which countries are active for gift card trading · {filtered.length} countries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl hover:bg-[#F5F7FB] transition-colors"
            style={{ fontSize: 13, fontWeight: 500, color: "#6B7280" }}
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl hover:bg-[#F5F7FB] transition-colors"
            style={{ fontSize: 13, fontWeight: 500, color: "#6B7280" }}
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Countries", value: countries.length, color: "#0159C7", bg: "#EFF4FF" },
          { label: "Active", value: activeCount, color: "#22C55E", bg: "#F0FDF4" },
          { label: "Inactive", value: inactiveCount, color: "#EF4444", bg: "#FEF2F2" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-border rounded-2xl p-5 flex items-center gap-4"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: s.bg }}
            >
              <Globe className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-[#6B7280]" style={{ fontSize: 12, fontWeight: 500 }}>
                {s.label}
              </div>
              <div className="text-[#272936]" style={{ fontSize: 22, fontWeight: 700 }}>
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 px-5 py-4 border-b border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              className="w-full pl-9 pr-4 py-2 bg-[#F5F7FB] border border-border rounded-xl outline-none focus:ring-2 focus:ring-[#0159C7] focus:border-transparent"
              placeholder="Search by country name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: 14 }}
            />
          </div>
          <div className="flex gap-2">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterActive(f)}
                className={`px-4 py-2 rounded-xl transition-colors capitalize ${
                  filterActive === f
                    ? "bg-[#0159C7] text-white"
                    : "bg-[#F5F7FB] text-[#6B7280] hover:bg-[#E8EBF0]"
                }`}
                style={{ fontSize: 13, fontWeight: 500 }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-[#6B7280]">
            <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "#0159C7" }} />
            <span style={{ fontSize: 14 }}>Loading countries…</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Globe className="w-12 h-12 text-[#D1D5DB]" />
            <p className="text-[#6B7280]" style={{ fontSize: 14 }}>No countries found</p>
          </div>
        ) : (
          <>
            {/* Header row */}
            <div
              className="grid items-center px-5 py-2 bg-[#F5F7FB] border-b border-border"
              style={{ gridTemplateColumns: "2.5rem 1fr 6rem 10rem 7rem" }}
            >
              {["", "Country", "Code", "Active Brands", "Status"].map((h) => (
                <span
                  key={h}
                  className="text-[#6B7280]"
                  style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}
                >
                  {h.toUpperCase()}
                </span>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {paginated.map((country) => {
                  const isToggling = toggling.has(country.code);
                  return (
                    <motion.div
                      key={country.code}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid items-center px-5 py-3.5 hover:bg-[#F5F7FB] transition-colors"
                      style={{ gridTemplateColumns: "2.5rem 1fr 6rem 10rem 7rem" }}
                    >
                      {/* Flag */}
                      <span style={{ fontSize: 24 }}>{countryFlag(country.code)}</span>

                      {/* Name */}
                      <div className="min-w-0">
                        <div
                          className="text-[#272936] truncate"
                          style={{ fontSize: 14, fontWeight: 600 }}
                        >
                          {country.name}
                        </div>
                      </div>

                      {/* Code */}
                      <span
                        className="font-mono text-[#6B7280] bg-[#F5F7FB] rounded-lg px-2 py-0.5 w-fit"
                        style={{ fontSize: 12 }}
                      >
                        {country.code}
                      </span>

                      {/* Active brands */}
                      <div className="flex items-center gap-1">
                        <span className="text-[#272936]" style={{ fontSize: 13, fontWeight: 600 }}>
                          {country.activeBrandsCount}
                        </span>
                        <span className="text-[#6B7280]" style={{ fontSize: 12 }}>
                          brand{country.activeBrandsCount !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Toggle */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            country.isActive
                              ? "bg-[#DCFCE7] text-[#22C55E]"
                              : "bg-[#FEE2E2] text-[#EF4444]"
                          }`}
                          style={{ fontSize: 11 }}
                        >
                          {country.isActive ? "Active" : "Inactive"}
                        </span>
                        {canEdit && (
                          <button
                            onClick={() => toggleCountry(country.code, country.isActive)}
                            disabled={isToggling}
                            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#E8EBF0] transition-colors disabled:opacity-50"
                            title={country.isActive ? "Deactivate country" : "Activate country"}
                          >
                            {isToggling ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-[#9CA3AF]" />
                            ) : country.isActive ? (
                              <ToggleRight className="w-5 h-5 text-[#22C55E]" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-[#9CA3AF]" />
                            )}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <span className="text-[#6B7280]" style={{ fontSize: 13 }}>
                  Page {safePage} of {totalPages} · {filtered.length} countries
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-[#F5F7FB] disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-[#F5F7FB] disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Permission notice */}
      {!canEdit && (
        <div className="flex items-center gap-2 px-4 py-3 bg-[#FFF8F0] border border-[#F59E0B]/30 rounded-xl">
          <X className="w-4 h-4 text-[#F59E0B] shrink-0" />
          <span className="text-[#92400E]" style={{ fontSize: 13 }}>
            You have view-only access. Contact a Super Admin to activate or deactivate countries.
          </span>
        </div>
      )}
    </div>
  );
}
