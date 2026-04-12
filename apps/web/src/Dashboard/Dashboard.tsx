import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "@/Shared/Icon";
import { Link01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import type { Id } from "../../convex/_generated/dataModel";

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
  const { signOut } = useAuthActions();
  const navigate = useNavigate({ from: "/dashboard" });
  const { sort: sortField, order: sortOrder } = useSearch({
    from: "/dashboard",
  });
  const products = useQuery(
    api.products.list,
    isAuthenticated ? {} : "skip",
  );
  const user = useQuery(
    api.products.currentUser,
    isAuthenticated ? {} : "skip",
  );
  const addProduct = useMutation(api.products.add);
  const removeProduct = useMutation(api.products.remove);
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-clear add error
  useEffect(() => {
    if (!addError) return;
    const timer = setTimeout(() => setAddError(null), 5000);
    return () => clearTimeout(timer);
  }, [addError]);

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
    setAddError(null);
    try {
      await addProduct({ url: url.trim() });
      setUrl("");
    } catch (error) {
      setAddError(
        error instanceof Error ? error.message : "No se pudo agregar",
      );
    } finally {
      setAdding(false);
    }
  }

  const sorted = [...(products ?? [])].sort((a, b) => {
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface font-body">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
          CARGANDO...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate({ to: "/" });
    return null;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface font-body">
      {/* Nav */}
      <nav aria-label="Navegación principal">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-medium text-black">AntiHot</span>
            <a
              href="https://cafecito.app/casilisto"
              rel="noopener noreferrer"
              target="_blank"
              className="hidden rounded focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:block"
            >
              <img
                srcSet="https://cdn.cafecito.app/imgs/buttons/button_5.png 1x, https://cdn.cafecito.app/imgs/buttons/button_5_2x.png 2x, https://cdn.cafecito.app/imgs/buttons/button_5_3.75x.png 3.75x"
                src="https://cdn.cafecito.app/imgs/buttons/button_5.png"
                alt="Invitame un café en cafecito.app"
                width={91}
                height={24}
                className="h-6 w-auto"
              />
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted sm:block">
              {productCount} {productCount === 1 ? "PRODUCTO" : "PRODUCTOS"}
            </span>
            {user?.pictureUrl ? (
              <img
                src={user.pictureUrl}
                alt={user.name ?? "Avatar"}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black">
                <span className="font-mono text-[11px] font-bold text-surface">
                  {(user?.name ?? "?").slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <button
              onClick={() => void signOut().then(() => navigate({ to: "/" }))}
              className="font-mono min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[11px] uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-black focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded"
            >
              Salir
            </button>
          </div>
        </div>
      </nav>

      {/* Input */}
      <div className="sticky top-14 z-10">
        <div
          className={`mx-auto flex items-center gap-2 px-4 transition-all duration-200 sm:gap-3 sm:px-6 ${
            scrolled ? "py-3 sm:max-w-2xl sm:py-1.5" : "max-w-6xl py-3"
          }`}
        >
          <div
            className={`flex flex-1 items-center rounded-full border border-border bg-surface-raised transition-all duration-200 focus-within:border-black ${
              scrolled ? "px-4 py-2.5 sm:px-3 sm:py-1.5" : "px-4 py-2.5"
            }`}
          >
            <Icon icon={Link01Icon} size={scrolled ? 14 : 16} className="text-text-muted" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Pegá la URL del producto..."
              aria-label="URL del producto"
              className={`ml-2.5 flex-1 bg-transparent text-text-primary outline-none transition-all duration-200 placeholder:text-text-muted ${
                scrolled ? "text-[12px]" : "text-[14px]"
              }`}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !url.trim()}
            className={`font-mono inline-flex items-center rounded-full bg-black uppercase tracking-[0.06em] text-surface transition-all duration-200 hover:bg-text-primary focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-40 ${
              scrolled ? "h-10 px-5 text-[12px] sm:h-8 sm:px-4 sm:text-[11px]" : "h-10 px-5 text-[12px]"
            }`}
          >
            {adding ? "AGREGANDO..." : "AGREGAR"}
          </button>
        </div>
        {addError && (
          <p className="mx-auto max-w-6xl px-4 pt-1 text-[13px] text-accent animate-fade-in sm:px-6">
            {addError}
          </p>
        )}
      </div>

      {/* HotSale date + Sort controls */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-2 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1" role="group" aria-label="Ordenar productos">
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
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
            HotSale comienza el 11/05/2026
          </span>
        </div>
      </div>

      {/* Product grid */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-2 pb-8 sm:px-6">
        {isLoadingProducts ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="min-w-0 animate-fade-in">
                <SkeletonCard />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
              SIN PRODUCTOS
            </span>
            <p className="mt-2 text-[15px] text-text-secondary">
              Pegá una URL arriba para empezar a trackear precios
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((product) => (
              <div key={product._id} className="min-w-0 animate-fade-in">
                <ProductCard
                  product={product}
                  onDelete={() =>
                    removeProduct({ productId: product._id as Id<"products"> })
                  }
                />
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
      className={`font-mono inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.08em] transition-colors focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:min-h-0 ${
        active
          ? "bg-black text-surface"
          : "text-text-muted hover:text-text-secondary"
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
  errorMessage?: string;
  status: "pending" | "scraped" | "error";
  priceBefore: number | null;
  priceHotsale: number | null;
  dateBefore: number | null;
  dateHotsale: number | null;
};

function CardHeader({
  product,
  onDelete,
}: {
  product: Product;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // Reset confirm state after 3 seconds
  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  // Click outside resets confirm
  useEffect(() => {
    if (!confirmDelete) return;
    const handleClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setConfirmDelete(false);
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [confirmDelete]);

  return (
    <div ref={headerRef} className="border-b border-border px-5 py-4">
      <div className="flex items-center justify-between">
        <span className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
          {product.store}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {confirmDelete ? (
            <button
              onClick={onDelete}
              className="font-mono min-h-[44px] px-2 text-[11px] uppercase tracking-[0.08em] text-accent transition-colors animate-fade-in focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              Confirmar
            </button>
          ) : (
            <>
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono min-h-[44px] inline-flex items-center px-1 text-[11px] uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-black focus-visible:ring-2 focus-visible:ring-black rounded"
              >
                Ver página
              </a>
              <button
                onClick={() => setConfirmDelete(true)}
                className="-my-2 -mr-2 inline-flex items-center justify-center p-3 text-border-visible transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-black rounded"
                title="Eliminar producto"
              >
                <Icon icon={Delete02Icon} size={16} />
              </button>
            </>
          )}
        </div>
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 overflow-hidden text-[16px] font-semibold leading-snug text-text-primary">
        <span
          className="min-w-0 shrink overflow-hidden whitespace-nowrap"
          style={{ textOverflow: "clip" }}
        >
          {product.title ?? "Producto"}
        </span>
        {(product.title?.length ?? 0) > 45 && (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded bg-border px-1.5 py-0.5 text-[10px] font-normal leading-none text-text-muted transition-colors hover:bg-border-visible focus-visible:ring-2 focus-visible:ring-black"
          >
            ···
          </a>
        )}
      </p>
    </div>
  );
}

function ProductCard({
  product,
  onDelete,
}: {
  product: Product;
  onDelete: () => void;
}) {
  const hasBothPrices =
    product.priceBefore !== null && product.priceHotsale !== null;
  const delta = hasBothPrices
    ? getDelta(product.priceBefore!, product.priceHotsale!)
    : null;

  if (product.status === "pending") {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface-raised">
        <div className="border-b border-border px-5 py-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
            {product.store}
          </span>
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-border" />
        </div>
        <div className="flex-1 px-5 py-4">
          <div className="h-3 w-20 animate-pulse rounded bg-border" />
          <div className="mt-3 h-6 w-32 animate-pulse rounded bg-border" />
        </div>
      </div>
    );
  }

  if (product.status === "error") {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface-raised">
        <CardHeader product={product} onDelete={onDelete} />
        <div className="flex-1 px-5 py-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
            {product.errorMessage ?? "ERROR: NO SE PUDO LEER"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface-raised">
      <CardHeader product={product} onDelete={onDelete} />

      {hasBothPrices ? (
        <>
          <div className="grid grid-cols-2 divide-x divide-border">
            <div className="px-5 py-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
                ANTES
              </span>
              <p className="font-mono mt-2 text-[16px] font-bold tracking-[-0.02em] text-text-primary sm:text-[20px]">
                {formatPrice(product.priceBefore!)}
              </p>
              <span className="font-mono mt-1 block text-[11px] tracking-[0.08em] text-text-muted">
                {formatDate(product.dateBefore!)}
              </span>
            </div>
            <div className="px-5 py-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
                HOTSALE
              </span>
              <p className="font-mono mt-2 text-[16px] font-bold tracking-[-0.02em] text-text-primary sm:text-[20px]">
                {formatPrice(product.priceHotsale!)}
              </p>
              <span className="font-mono mt-1 block text-[11px] tracking-[0.08em] text-text-muted">
                {formatDate(product.dateHotsale!)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p
              className={`text-[14px] font-medium ${
                delta!.type === "up"
                  ? "text-accent"
                  : delta!.type === "down"
                    ? "text-green"
                    : "text-text-muted"
              }`}
            >
              {delta!.label}
            </p>
            <span
              className={`font-mono rounded-full border px-2.5 py-0.5 text-[12px] font-bold tracking-[-0.02em] ${
                delta!.type === "up"
                  ? "border-accent text-accent"
                  : delta!.type === "down"
                    ? "border-green text-green"
                    : "border-border-visible text-text-muted"
              }`}
            >
              {delta!.pct}
            </span>
          </div>
        </>
      ) : (
        <div className="flex-1 px-5 py-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
            PRECIO REGISTRADO
          </span>
          {product.priceBefore !== null ? (
            <>
              <p className="font-mono mt-2 text-[16px] font-bold tracking-[-0.02em] text-text-primary sm:text-[20px]">
                {formatPrice(product.priceBefore)}
              </p>
              <span className="font-mono mt-1 block text-[11px] tracking-[0.08em] text-text-muted">
                {formatDate(product.dateBefore!)}
              </span>
            </>
          ) : (
            <div className="mt-2 h-6 w-32 animate-pulse rounded bg-border" />
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface-raised">
      <div className="border-b border-border px-5 py-4">
        <div className="h-3 w-24 animate-pulse rounded bg-border" />
        <div className="mt-3 h-4 w-48 animate-pulse rounded bg-border" />
      </div>
      <div className="flex-1 px-5 py-4">
        <div className="h-3 w-20 animate-pulse rounded bg-border" />
        <div className="mt-3 h-6 w-32 animate-pulse rounded bg-border" />
        <div className="mt-2 h-3 w-16 animate-pulse rounded bg-border" />
      </div>
    </div>
  );
}
