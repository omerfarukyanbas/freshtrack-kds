import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import * as adminApi from "../api/admin";

type SortKey =
  | "business_name"
  | "owner_name"
  | "email"
  | "created_at"
  | "total_products"
  | "critical_products"
  | "estimated_risk_amount";

type SortState = { key: SortKey | null; dir: "asc" | "desc" };

type TypeFilterValue = "all" | "market" | "bakkal" | "mini_market" | "other";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR");
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function displayAddress(address: string | null | undefined): { text: string; empty: boolean } {
  const t = address?.trim() ?? "";
  if (!t) return { text: "Adres bilgisi yok", empty: true };
  return { text: t, empty: false };
}

function classifyBusinessType(bt: string | null | undefined): Exclude<TypeFilterValue, "all"> {
  const s = (bt ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (s === "market") return "market";
  if (s === "bakkal") return "bakkal";
  if (s === "mini market" || s === "mini-market" || s === "minimarket") return "mini_market";
  return "other";
}

function formatBusinessTypeLabel(bt: string | undefined | null): string {
  const cat = classifyBusinessType(bt);
  if (cat === "market") return "Market";
  if (cat === "bakkal") return "Bakkal";
  if (cat === "mini_market") return "Mini Market";
  return bt?.trim() ? bt.trim() : "Diğer";
}

/** Kelime ortasından bolunmayi azaltir; gerektiginde satir kirilir. */
const addressColLayout = {
  minWidth: "13.5rem",
  width: "22%",
  maxWidth: "26rem",
} as const;

function compareBusinessRows(
  a: adminApi.AdminBusiness,
  b: adminApi.AdminBusiness,
  key: SortKey,
): number {
  switch (key) {
    case "business_name":
      return a.business_name.localeCompare(b.business_name, "tr", { sensitivity: "base" });
    case "owner_name":
      return a.owner_name.localeCompare(b.owner_name, "tr", { sensitivity: "base" });
    case "email":
      return a.email.localeCompare(b.email, "tr", { sensitivity: "base" });
    case "created_at":
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    case "total_products":
      return a.total_products - b.total_products;
    case "critical_products":
      return a.critical_products - b.critical_products;
    case "estimated_risk_amount":
      return a.estimated_risk_amount - b.estimated_risk_amount;
    default:
      return 0;
  }
}

function SortTh({
  columnKey,
  sort,
  onSort,
  alignEnd,
  ariaLabel,
  thStyle,
  children,
}: {
  columnKey: SortKey;
  sort: SortState;
  onSort: (k: SortKey) => void;
  alignEnd?: boolean;
  ariaLabel: string;
  thStyle?: CSSProperties;
  children: ReactNode;
}) {
  const active = sort.key === columnKey;
  const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
  const icon = active ? (sort.dir === "asc" ? "↑" : "↓") : "⇅";

  return (
    <th
      className={"sortable-head" + (active ? " sortable-head--active" : "")}
      style={thStyle}
      aria-sort={ariaSort}
    >
      <button
        type="button"
        className={"sortable-head__btn" + (alignEnd ? " sortable-head__btn--end" : "")}
        onClick={() => onSort(columnKey)}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        <span>{children}</span>
        <span className="sortable-head__icon" aria-hidden>
          {icon}
        </span>
      </button>
    </th>
  );
}

export function AdminBusinessesPage() {
  const [rows, setRows] = useState<adminApi.AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: null, dir: "asc" });
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>("all");
  const [addressQuery, setAddressQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await adminApi.fetchBusinesses();
        if (mounted) setRows(data);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Veri alinamadi");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function handleSort(columnKey: SortKey) {
    setSort((prev) => {
      if (prev.key !== columnKey) return { key: columnKey, dir: "asc" };
      return { key: columnKey, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  }

  const filteredRows = useMemo(() => {
    const q = addressQuery.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((row) => {
      if (typeFilter !== "all") {
        if (classifyBusinessType(row.business_type) !== typeFilter) return false;
      }
      if (q) {
        const addr = (row.address?.trim() ?? "").toLocaleLowerCase("tr-TR");
        if (!addr.includes(q)) return false;
      }
      return true;
    });
  }, [rows, typeFilter, addressQuery]);

  const displayedRows = useMemo(() => {
    if (!sort.key) return filteredRows;
    const next = [...filteredRows];
    next.sort((a, b) => {
      const c = compareBusinessRows(a, b, sort.key!);
      return sort.dir === "asc" ? c : -c;
    });
    return next;
  }, [filteredRows, sort.key, sort.dir]);

  const hasActiveFilters = typeFilter !== "all" || addressQuery.trim() !== "";

  function clearFilters() {
    setTypeFilter("all");
    setAddressQuery("");
  }

  if (loading) return <p className="muted">Isletmeler yukleniyor...</p>;
  if (error) return <div className="alert alert--error">{error}</div>;

  const filterBarStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: "1rem",
    paddingBottom: "1rem",
    marginBottom: "1rem",
    borderBottom: "1px solid var(--border)",
  };

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel__head">
          <h2>Isletmeler</h2>
        </div>

        <div style={filterBarStyle}>
          <label className="field" style={{ margin: 0, minWidth: "11rem" }}>
            <span>Isletme tipi</span>
            <select
              className="profile-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilterValue)}
              aria-label="Isletme tipine gore filtrele"
            >
              <option value="all">Tümü</option>
              <option value="market">Market</option>
              <option value="bakkal">Bakkal</option>
              <option value="mini_market">Mini Market</option>
              <option value="other">Diğer</option>
            </select>
          </label>
          <label className="field" style={{ margin: 0, flex: "1 1 16rem", minWidth: "12rem", maxWidth: "28rem" }}>
            <span>Adres ara</span>
            <input
              type="search"
              autoComplete="off"
              placeholder="Ornek: Ankara, İstanbul, mahalle..."
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              aria-label="Adres icinde ara"
            />
          </label>
          {hasActiveFilters ? (
            <button type="button" className="btn btn--ghost" onClick={clearFilters}>
              Filtreleri Temizle
            </button>
          ) : null}
        </div>

        <div className="table-wrap">
          <table className="data-table" lang="tr" style={{ minWidth: "72rem" }}>
            <thead>
              <tr>
                <SortTh
                  columnKey="business_name"
                  sort={sort}
                  onSort={handleSort}
                  ariaLabel="Isletme adina gore sirala"
                >
                  Isletme
                </SortTh>
                <SortTh
                  columnKey="owner_name"
                  sort={sort}
                  onSort={handleSort}
                  ariaLabel="Yetkili kisiye gore sirala"
                >
                  Yetkili
                </SortTh>
                <SortTh columnKey="email" sort={sort} onSort={handleSort} ariaLabel="E-postaya gore sirala">
                  Email
                </SortTh>
                <th>Tip</th>
                <th style={{ ...addressColLayout, verticalAlign: "bottom", padding: "0.75rem 1rem" }}>Adres</th>
                <SortTh
                  columnKey="created_at"
                  sort={sort}
                  onSort={handleSort}
                  ariaLabel="Kayit tarihine gore sirala"
                >
                  Kayit
                </SortTh>
                <SortTh
                  columnKey="total_products"
                  sort={sort}
                  onSort={handleSort}
                  alignEnd
                  ariaLabel="Toplam urun sayisina gore sirala"
                >
                  Toplam urun
                </SortTh>
                <SortTh
                  columnKey="critical_products"
                  sort={sort}
                  onSort={handleSort}
                  alignEnd
                  ariaLabel="Kritik urun sayisina gore sirala"
                >
                  Kritik urun
                </SortTh>
                <SortTh
                  columnKey="estimated_risk_amount"
                  sort={sort}
                  onSort={handleSort}
                  alignEnd
                  ariaLabel="Risk tutarina gore sirala"
                >
                  Risk tutari
                </SortTh>
                <th>Detay</th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="muted" style={{ textAlign: "center", padding: "1.5rem" }}>
                    {rows.length === 0
                      ? "Kayitli isletme yok."
                      : "Filtrelere uygun isletme bulunamadi."}
                  </td>
                </tr>
              ) : (
                displayedRows.map((row) => {
                  const addr = displayAddress(row.address);
                  return (
                    <tr key={row.id}>
                      <td className="cell-strong">{row.business_name}</td>
                      <td>{row.owner_name}</td>
                      <td>{row.email}</td>
                      <td>{formatBusinessTypeLabel(row.business_type)}</td>
                      <td
                        className={addr.empty ? "muted" : undefined}
                        style={{
                          ...addressColLayout,
                          verticalAlign: "top",
                          whiteSpace: addr.empty ? "nowrap" : "normal",
                          wordBreak: "normal",
                          overflowWrap: "break-word",
                          lineHeight: addr.empty ? undefined : 1.45,
                        }}
                        title={addr.empty ? undefined : addr.text}
                      >
                        {addr.text}
                      </td>
                      <td>{formatDate(row.created_at)}</td>
                      <td style={{ textAlign: "right" }}>{row.total_products}</td>
                      <td style={{ textAlign: "right" }}>{row.critical_products}</td>
                      <td style={{ textAlign: "right" }}>{formatMoney(row.estimated_risk_amount)}</td>
                      <td style={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                        <Link to={`/admin/businesses/${row.id}`} className="btn btn--ghost btn--sm">
                          Ac
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
