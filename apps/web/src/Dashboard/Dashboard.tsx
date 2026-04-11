import { useState } from "react";
import { Icon } from "@/Shared/Icon";
import { Link01Icon } from "@hugeicons/core-free-icons";

const MOCK_PRODUCTS = [
  {
    id: "1",
    store: "fravega.com",
    title: 'Samsung Crystal UHD 55" TU7000',
    priceBefore: 849999,
    priceHotsale: 899999,
    dateBefore: "15/04/2026",
    dateHotsale: "12/05/2026",
    status: "up" as const,
  },
  {
    id: "2",
    store: "mercadolibre.com.ar",
    title: "Apple AirPods Pro 2da Gen USB-C",
    priceBefore: 389999,
    priceHotsale: null,
    dateBefore: "10/04/2026",
    dateHotsale: null,
    status: "pending" as const,
  },
];

type SortField = "price" | "date";
type SortOrder = "asc" | "desc";

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function getDelta(before: number, after: number) {
  const diff = after - before;
  const pct = ((diff / before) * 100).toFixed(1);
  if (diff > 0) return { label: `Subió ${formatPrice(diff)}`, pct: `+${pct}%`, type: "up" as const };
  if (diff < 0) return { label: `Bajó ${formatPrice(Math.abs(diff))}`, pct: `${pct}%`, type: "down" as const };
  return { label: "Sin cambio", pct: "0%", type: "same" as const };
}

export function Dashboard() {
  const [sortField, setSortField] = useState<SortField>("price");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [url, setUrl] = useState("");

  const sorted = [...MOCK_PRODUCTS].sort((a, b) => {
    const dir = sortOrder === "desc" ? -1 : 1;
    if (sortField === "price") return (a.priceBefore - b.priceBefore) * dir;
    return a.dateBefore.localeCompare(b.dateBefore) * dir;
  });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] font-nothing">
      {/* Nav */}
      <nav>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <p className="text-[15px] font-medium text-[#000000]">AntiHot</p>
          <div className="flex items-center gap-4">
            <p className="font-nothing-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
              2 PRODUCTOS
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#000000]">
              <span className="font-nothing-mono text-[11px] font-bold text-[#F5F5F5]">
                JP
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Input */}
      <div className="sticky top-14 z-10 bg-[#F5F5F5]">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3">
          <div className="flex flex-1 items-center rounded-full border border-[#E8E8E8] bg-[#FFFFFF] px-4 py-2.5 transition-colors focus-within:border-[#000000]">
            <Icon icon={Link01Icon} size={16} className="text-[#999999]" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Pegá la URL del producto..."
              className="ml-2.5 flex-1 bg-transparent text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#999999]"
            />
          </div>
          <button className="font-nothing-mono inline-flex h-10 items-center rounded-full bg-[#000000] px-5 text-[12px] uppercase tracking-[0.06em] text-[#F5F5F5] transition-colors hover:bg-[#1A1A1A]">
            AGREGAR
          </button>
        </div>
      </div>

      {/* Sort controls */}
      <div className="mx-auto w-full max-w-6xl px-6 pt-6 pb-2">
        <div className="flex items-center gap-1">
          <SortButton
            label="PRECIO"
            active={sortField === "price"}
            order={sortField === "price" ? sortOrder : null}
            onClick={() => toggleSort("price")}
          />
          <SortButton
            label="FECHA"
            active={sortField === "date"}
            order={sortField === "date" ? sortOrder : null}
            onClick={() => toggleSort("date")}
          />
        </div>
      </div>

      {/* Product grid */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-2 pb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="animate-fade-in" style={{ animationDelay: "0ms" }}>
            <SkeletonCard />
          </div>
          {sorted.map((product, i) => (
            <div
              key={product.id}
              className="animate-fade-in"
              style={{ animationDelay: `${(i + 1) * 150}ms` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function SortButton({
  label,
  active,
  order,
  onClick,
}: {
  label: string;
  active: boolean;
  order: SortOrder | null;
  onClick: () => void;
}) {
  const arrow = order === "desc" ? "↓" : order === "asc" ? "↑" : "";
  return (
    <button
      onClick={onClick}
      className={`font-nothing-mono inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] transition-colors ${
        active
          ? "bg-[#000000] text-[#F5F5F5]"
          : "text-[#999999] hover:text-[#666666]"
      }`}
    >
      {label}
      {arrow && <span>{arrow}</span>}
    </button>
  );
}

type Product = (typeof MOCK_PRODUCTS)[number];

function ProductCard({ product }: { product: Product }) {
  const hasBothPrices = product.priceHotsale !== null;
  const delta = hasBothPrices
    ? getDelta(product.priceBefore, product.priceHotsale!)
    : null;

  return (
    <div className="overflow-hidden rounded-xl border border-[#E8E8E8] bg-[#FFFFFF]">
      {/* Header */}
      <div className="border-b border-[#E8E8E8] px-5 py-4">
        <p className="font-nothing-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
          {product.store}
        </p>
        <p className="mt-1.5 text-[15px] font-medium leading-snug text-[#1A1A1A]">
          {product.title}
        </p>
      </div>

      {hasBothPrices ? (
        <>
          {/* Both prices */}
          <div className="grid grid-cols-2 divide-x divide-[#E8E8E8]">
            <div className="px-5 py-4">
              <p className="font-nothing-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
                ANTES
              </p>
              <p className="font-nothing-mono mt-2 text-[20px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
                {formatPrice(product.priceBefore)}
              </p>
              <p className="font-nothing-mono mt-1 text-[11px] tracking-[0.08em] text-[#999999]">
                {product.dateBefore}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="font-nothing-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
                HOTSALE
              </p>
              <p className="font-nothing-mono mt-2 text-[20px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
                {formatPrice(product.priceHotsale!)}
              </p>
              <p className="font-nothing-mono mt-1 text-[11px] tracking-[0.08em] text-[#999999]">
                {product.dateHotsale}
              </p>
            </div>
          </div>
          {/* Verdict */}
          <div className="flex items-center justify-between border-t border-[#E8E8E8] px-5 py-3">
            <p
              className={`text-[14px] font-medium ${
                delta!.type === "up"
                  ? "text-[#D71921]"
                  : delta!.type === "down"
                    ? "text-[#4A9E5C]"
                    : "text-[#999999]"
              }`}
            >
              {delta!.label}
            </p>
            <span
              className={`font-nothing-mono rounded-full border px-2.5 py-0.5 text-[12px] font-bold tracking-[-0.02em] ${
                delta!.type === "up"
                  ? "border-[#D71921] text-[#D71921]"
                  : delta!.type === "down"
                    ? "border-[#4A9E5C] text-[#4A9E5C]"
                    : "border-[#CCCCCC] text-[#999999]"
              }`}
            >
              {delta!.pct}
            </span>
          </div>
        </>
      ) : (
        /* Pre-HotSale: only before price */
        <div className="px-5 py-4">
          <p className="font-nothing-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
            PRECIO REGISTRADO
          </p>
          <p className="font-nothing-mono mt-2 text-[20px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
            {formatPrice(product.priceBefore)}
          </p>
          <p className="font-nothing-mono mt-1 text-[11px] tracking-[0.08em] text-[#999999]">
            {product.dateBefore}
          </p>
          <p className="font-nothing-mono mt-3 text-[11px] uppercase tracking-[0.08em] text-[#999999]">
            ESPERANDO HOTSALE...
          </p>
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E8E8E8] bg-[#FFFFFF]">
      <div className="border-b border-[#E8E8E8] px-5 py-4">
        <div className="h-3 w-24 animate-pulse rounded bg-[#E8E8E8]" />
        <div className="mt-3 h-4 w-48 animate-pulse rounded bg-[#E8E8E8]" />
      </div>
      <div className="px-5 py-4">
        <div className="h-3 w-20 animate-pulse rounded bg-[#E8E8E8]" />
        <div className="mt-3 h-6 w-32 animate-pulse rounded bg-[#E8E8E8]" />
        <div className="mt-2 h-3 w-16 animate-pulse rounded bg-[#E8E8E8]" />
      </div>
    </div>
  );
}

