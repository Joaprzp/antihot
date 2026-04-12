import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "@/Shared/Icon";
import { Spinner } from "@/Shared/Spinner";
import { Link01Icon } from "@hugeicons/core-free-icons";

function useDelayedLoading(isLoading: boolean, delayMs = 300) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (isLoading) {
      timer.current = setTimeout(() => setShow(true), delayMs);
    } else {
      if (timer.current) clearTimeout(timer.current);
      setShow(false);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [isLoading, delayMs]);

  return show;
}

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

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(ts));
}

function getDelta(before: number, after: number) {
  const diff = after - before;
  const pct = ((diff / before) * 100).toFixed(1);
  if (diff > 0)
    return {
      label: `Subió ${formatPrice(diff)}`,
      pct: `+${pct}%`,
      type: "up" as const,
    };
  if (diff < 0)
    return {
      label: `Bajó ${formatPrice(Math.abs(diff))}`,
      pct: `${pct}%`,
      type: "down" as const,
    };
  return { label: "Sin cambio", pct: "0%", type: "same" as const };
}

export function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate({ from: "/dashboard" });
  const { sort: sortField, order: sortOrder } = useSearch({
    from: "/dashboard",
  });
  const products = useQuery(
    api.products.list,
    isAuthenticated ? {} : "skip",
  );
  const addProduct = useMutation(api.products.add);
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function setSort(field: SortField, order: SortOrder) {
    navigate({ search: { sort: field, order } });
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSort(field, sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSort(field, "desc");
    }
  }

  async function handleAdd() {
    if (!url.trim()) return;
    setAdding(true);
    try {
      await addProduct({ url: url.trim() });
      setUrl("");
    } catch {
      // TODO: inline error on card
    } finally {
      setAdding(false);
    }
  }

  const sorted = [...(products ?? [])].sort((a, b) => {
    // Pending/error products always first
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;

    const dir = sortOrder === "desc" ? -1 : 1;
    if (sortField === "price") {
      return ((a.priceBefore ?? 0) - (b.priceBefore ?? 0)) * dir;
    }
    return (a._creationTime - b._creationTime) * dir;
  });

  const isLoadingProducts = useDelayedLoading(
    isAuthenticated && products === undefined,
  );
  const productCount = products?.length ?? 0;

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] font-nothing">
        <p className="font-nothing-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
          CARGANDO...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate({ to: "/" });
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] font-nothing">
      {/* Nav */}
      <nav>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <p className="text-[15px] font-medium text-[#000000]">AntiHot</p>
            <a
              href="https://cafecito.app/casilisto"
              rel="noopener"
              target="_blank"
            >
              <img
                srcSet="https://cdn.cafecito.app/imgs/buttons/button_5.png 1x, https://cdn.cafecito.app/imgs/buttons/button_5_2x.png 2x, https://cdn.cafecito.app/imgs/buttons/button_5_3.75x.png 3.75x"
                src="https://cdn.cafecito.app/imgs/buttons/button_5.png"
                alt="Invitame un café en cafecito.app"
                className="h-6"
              />
            </a>
          </div>
          <div className="flex items-center gap-4">
            <p className="font-nothing-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
              {productCount} {productCount === 1 ? "PRODUCTO" : "PRODUCTOS"}
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
      <div className="sticky top-14 z-10">
        <div
          className={`mx-auto flex items-center gap-3 px-6 transition-all duration-200 ${
            scrolled ? "max-w-2xl py-1.5" : "max-w-6xl py-3"
          }`}
        >
          <div
            className={`flex flex-1 items-center rounded-full border border-[#E8E8E8] bg-[#FFFFFF] transition-all duration-200 focus-within:border-[#000000] ${
              scrolled ? "px-3 py-1.5" : "px-4 py-2.5"
            }`}
          >
            <Icon icon={Link01Icon} size={scrolled ? 14 : 16} className="text-[#999999]" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Pegá la URL del producto..."
              className={`ml-2.5 flex-1 bg-transparent text-[#1A1A1A] outline-none transition-all duration-200 placeholder:text-[#999999] ${
                scrolled ? "text-[12px]" : "text-[14px]"
              }`}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !url.trim()}
            className={`font-nothing-mono inline-flex items-center rounded-full bg-[#000000] uppercase tracking-[0.06em] text-[#F5F5F5] transition-all duration-200 hover:bg-[#1A1A1A] disabled:opacity-40 ${
              scrolled ? "h-8 px-4 text-[11px]" : "h-10 px-5 text-[12px]"
            }`}
          >
            {adding ? "AGREGANDO..." : "AGREGAR"}
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
        {isLoadingProducts ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="animate-fade-in"
              >
                <SkeletonCard />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <p className="font-nothing-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
              SIN PRODUCTOS
            </p>
            <p className="mt-2 text-[15px] text-[#666666]">
              Pegá una URL arriba para empezar a trackear precios
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((product) => (
              <div
                key={product._id}
                className="animate-fade-in"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
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

type Product = {
  _id: string;
  _creationTime: number;
  url: string;
  store: string;
  title?: string;
  status: "pending" | "scraped" | "error";
  priceBefore: number | null;
  priceHotsale: number | null;
  dateBefore: number | null;
  dateHotsale: number | null;
};

function ProductCard({ product }: { product: Product }) {
  const hasBothPrices =
    product.priceBefore !== null && product.priceHotsale !== null;
  const delta = hasBothPrices
    ? getDelta(product.priceBefore!, product.priceHotsale!)
    : null;

  if (product.status === "pending") {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[#E8E8E8] bg-[#FFFFFF]">
        <div className="border-b border-[#E8E8E8] px-5 py-4">
          <p className="font-nothing-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
            {product.store}
          </p>
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-[#E8E8E8]" />
        </div>
        <div className="flex-1 px-5 py-4">
          <div className="h-3 w-20 animate-pulse rounded bg-[#E8E8E8]" />
          <div className="mt-3 h-6 w-32 animate-pulse rounded bg-[#E8E8E8]" />
          <p className="font-nothing-mono mt-3 text-[11px] tracking-[0.08em] text-[#999999]">
            <Spinner name="braille" className="mr-1.5" />
          </p>
        </div>
      </div>
    );
  }

  if (product.status === "error") {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[#E8E8E8] bg-[#FFFFFF]">
        <div className="border-b border-[#E8E8E8] px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="font-nothing-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
              {product.store}
            </p>
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-nothing-mono text-[11px] uppercase tracking-[0.08em] text-[#999999] transition-colors hover:text-[#000000]"
            >
              Ver página
            </a>
          </div>
          <p className="mt-1.5 text-[15px] font-medium leading-snug text-[#1A1A1A]">
            {product.title ?? "Producto"}
          </p>
        </div>
        <div className="flex-1 px-5 py-4">
          <p className="font-nothing-mono text-[11px] uppercase tracking-[0.08em] text-[#D71921]">
            ERROR: NO SE PUDO LEER
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[#E8E8E8] bg-[#FFFFFF]">
      {/* Header */}
      <div className="border-b border-[#E8E8E8] px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="font-nothing-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
            {product.store}
          </p>
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-nothing-mono text-[11px] uppercase tracking-[0.08em] text-[#999999] transition-colors hover:text-[#000000]"
          >
            Ver página
          </a>
        </div>
        <p className="mt-1.5 text-[15px] font-medium leading-snug text-[#1A1A1A]">
          {product.title ?? "Producto"}
        </p>
      </div>

      {hasBothPrices ? (
        <>
          <div className="grid grid-cols-2 divide-x divide-[#E8E8E8]">
            <div className="px-5 py-4">
              <p className="font-nothing-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
                ANTES
              </p>
              <p className="font-nothing-mono mt-2 text-[20px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
                {formatPrice(product.priceBefore!)}
              </p>
              <p className="font-nothing-mono mt-1 text-[11px] tracking-[0.08em] text-[#999999]">
                {formatDate(product.dateBefore!)}
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
                {formatDate(product.dateHotsale!)}
              </p>
            </div>
          </div>
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
        <div className="flex-1 px-5 py-4">
          <p className="font-nothing-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
            PRECIO REGISTRADO
          </p>
          {product.priceBefore !== null ? (
            <>
              <p className="font-nothing-mono mt-2 text-[20px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
                {formatPrice(product.priceBefore)}
              </p>
              <p className="font-nothing-mono mt-1 text-[11px] tracking-[0.08em] text-[#999999]">
                {formatDate(product.dateBefore!)}
              </p>
            </>
          ) : (
            <div className="mt-2 h-6 w-32 animate-pulse rounded bg-[#E8E8E8]" />
          )}
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
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[#E8E8E8] bg-[#FFFFFF]">
      <div className="border-b border-[#E8E8E8] px-5 py-4">
        <div className="h-3 w-24 animate-pulse rounded bg-[#E8E8E8]" />
        <div className="mt-3 h-4 w-48 animate-pulse rounded bg-[#E8E8E8]" />
      </div>
      <div className="flex-1 px-5 py-4">
        <div className="h-3 w-20 animate-pulse rounded bg-[#E8E8E8]" />
        <div className="mt-3 h-6 w-32 animate-pulse rounded bg-[#E8E8E8]" />
        <div className="mt-2 h-3 w-16 animate-pulse rounded bg-[#E8E8E8]" />
      </div>
    </div>
  );
}
