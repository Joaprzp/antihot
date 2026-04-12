import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function Landing() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [isAuthenticated, navigate]);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  function handleSignIn() {
    setSigningIn(true);
    setError(null);
    void signIn("google").catch(() => {
      setSigningIn(false);
      setError("No se pudo conectar. Intentá de nuevo.");
    });
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-surface font-body">
      {/* Nav */}
      <nav className="shrink-0 px-4 pt-5 sm:px-6" aria-label="Información del evento">
        <div className="flex items-center justify-center">
          <span className="font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-text-muted">
            HOTSALE EDICIÓN 2026
          </span>
        </div>
      </nav>

      {/* Main */}
      <main className="flex flex-1 items-center px-4 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          {/* Mobile layout: stacked, card first */}
          <div className="flex flex-col items-center gap-8 md:hidden">
            <MiniDemoCard />
            <div className="w-full text-center">
              <h1 className="text-[clamp(2rem,6vw,3.5rem)] leading-[1.05] font-normal tracking-[-0.03em] text-black">
                Descuento o <span className="text-accent">verso?</span>
              </h1>
              <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-text-secondary">
                Guardá el precio de cualquier producto antes del HotSale.
                Nosotros lo revisamos el día del evento y te mostramos si el
                descuento es posta.
              </p>
              <div className="mt-8">
                <button
                  onClick={handleSignIn}
                  disabled={isLoading || signingIn}
                  className="font-mono inline-flex h-11 min-w-[140px] items-center justify-center gap-2.5 rounded-full bg-black px-6 text-[13px] uppercase tracking-[0.06em] text-surface transition-colors duration-200 hover:bg-text-primary focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-40"
                >
                  {isLoading || signingIn ? (
                    "CONECTANDO..."
                  ) : (
                    <>
                      <GoogleIcon />
                      EMPEZAR
                    </>
                  )}
                </button>
                {error && (
                  <p className="mt-3 text-[13px] text-accent animate-fade-in">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Desktop layout: side by side */}
          <div className="hidden md:grid md:grid-cols-[1.2fr_1fr] lg:gap-16 md:gap-10">
            <div className="flex flex-col justify-center">
              <h1 className="text-[clamp(2.5rem,5vw,4rem)] leading-[1.0] font-normal tracking-[-0.04em] text-black">
                Descuento o <span className="text-accent">verso?</span>
              </h1>
              <p className="mt-6 max-w-md text-[17px] leading-relaxed text-text-secondary">
                Guardá el precio de cualquier producto antes del HotSale.
                Nosotros lo revisamos el día del evento y te mostramos si el
                descuento es posta.
              </p>
              <div className="mt-10">
                <button
                  onClick={handleSignIn}
                  disabled={isLoading || signingIn}
                  className="font-mono inline-flex h-11 min-w-[140px] items-center justify-center gap-2.5 rounded-full bg-black px-6 text-[13px] uppercase tracking-[0.06em] text-surface transition-colors duration-200 hover:bg-text-primary focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-40"
                >
                  {isLoading || signingIn ? (
                    "CONECTANDO..."
                  ) : (
                    <>
                      <GoogleIcon />
                      EMPEZAR
                    </>
                  )}
                </button>
                {error && (
                  <p className="mt-3 text-[13px] text-accent animate-fade-in">
                    {error}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center">
              <DemoCard />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 px-4 pb-5 sm:px-6">
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
            HECHO CON <span className="font-sans">❤️</span>
          </span>
          <a
            href="https://cafecito.app/casilisto"
            rel="noopener noreferrer"
            target="_blank"
            className="focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded"
          >
            <img
              srcSet="https://cdn.cafecito.app/imgs/buttons/button_5.png 1x, https://cdn.cafecito.app/imgs/buttons/button_5_2x.png 2x, https://cdn.cafecito.app/imgs/buttons/button_5_3.75x.png 3.75x"
              src="https://cdn.cafecito.app/imgs/buttons/button_5.png"
              alt="Invitame un café en cafecito.app"
              width={76}
              height={20}
              className="h-5 w-auto"
            />
          </a>
        </div>
      </footer>
    </div>
  );
}

function MiniDemoCard() {
  return (
    <div className="w-full max-w-xs overflow-hidden rounded-lg border border-border bg-surface-raised">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted">
            ANTES
          </span>
          <p className="font-mono text-[18px] font-bold tracking-[-0.02em] text-text-primary">
            $849.999
          </p>
        </div>
        <div className="mx-3 text-text-muted">→</div>
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted">
            HOTSALE
          </span>
          <p className="font-mono text-[18px] font-bold tracking-[-0.02em] text-text-primary">
            $899.999
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <span className="text-[13px] font-medium text-accent">Subió $50.000</span>
        <span className="font-mono rounded-full border border-accent px-2 py-0.5 text-[11px] font-bold text-accent">
          +5.9%
        </span>
      </div>
    </div>
  );
}

function DemoCard() {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-surface-raised">
      {/* Header */}
      <div className="border-b border-border px-5 py-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
          FRAVEGA.COM
        </span>
        <p className="mt-1.5 text-[15px] font-medium leading-snug text-text-primary">
          Samsung Crystal UHD 55" TU7000
        </p>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="px-5 py-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
            ANTES
          </span>
          <p className="font-mono mt-2 text-[22px] font-bold tracking-[-0.02em] text-text-primary">
            $849.999
          </p>
          <span className="font-mono mt-1 block text-[11px] tracking-[0.08em] text-text-muted">
            15/04/2026
          </span>
        </div>
        <div className="px-5 py-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
            HOTSALE
          </span>
          <p className="font-mono mt-2 text-[22px] font-bold tracking-[-0.02em] text-text-primary">
            $899.999
          </p>
          <span className="font-mono mt-1 block text-[11px] tracking-[0.08em] text-text-muted">
            12/05/2026
          </span>
        </div>
      </div>

      {/* Verdict */}
      <div className="flex items-center justify-between border-t border-border px-5 py-4">
        <div>
          <p className="text-[15px] font-medium text-accent">
            Subió $50.000
          </p>
          <span className="font-mono mt-0.5 block text-[11px] uppercase tracking-[0.08em] text-text-muted">
            EL DESCUENTO ES CHAMUYO
          </span>
        </div>
        <span className="font-mono rounded-full border border-accent px-3 py-1 text-[13px] font-bold tracking-[-0.02em] text-accent">
          +5.9%
        </span>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="currentColor" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" />
    </svg>
  );
}
