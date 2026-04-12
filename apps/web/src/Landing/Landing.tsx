import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function Landing() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F5F5F5] font-body">
      {/* Nav */}
      <nav className="shrink-0 px-6 pt-5">
        <div className="flex items-center justify-center">
          <p className="font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-[#666666]">
            HOTSALE EDICIÓN 2026
          </p>
        </div>
      </nav>

      {/* Main */}
      <main className="flex flex-1 items-center px-6">
        <div className="mx-auto grid w-full max-w-5xl gap-16 lg:grid-cols-[1.2fr_1fr]">
          {/* Left — copy */}
          <div className="flex flex-col justify-center">
            <h1 className="whitespace-nowrap text-[clamp(2.5rem,4vw,3.5rem)] leading-[1.05] font-light tracking-[-0.03em] text-[#000000]">
              Descuento o verso?
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed font-light text-[#1A1A1A]">
              Guardá el precio de cualquier producto antes del HotSale.
              Nosotros lo revisamos el día del evento y te mostramos si el
              descuento es posta.
            </p>
            <div className="mt-10">
              <button
                onClick={() => {
                  setSigningIn(true);
                  void signIn("google");
                }}
                disabled={isLoading || signingIn}
                className="font-mono inline-flex h-11 items-center gap-2.5 rounded-full bg-[#000000] px-6 text-[13px] uppercase tracking-[0.06em] text-[#F5F5F5] transition-colors duration-200 hover:bg-[#1A1A1A] disabled:opacity-40"
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
            </div>
          </div>

          {/* Right — demo card */}
          <div className="hidden items-center justify-center lg:flex">
            <DemoCard />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 px-6 pb-5">
        <div className="flex items-center justify-center gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
            HECHO CON ❤️
          </p>
          <a href="https://cafecito.app/casilisto" rel="noopener" target="_blank">
            <img
              srcSet="https://cdn.cafecito.app/imgs/buttons/button_5.png 1x, https://cdn.cafecito.app/imgs/buttons/button_5_2x.png 2x, https://cdn.cafecito.app/imgs/buttons/button_5_3.75x.png 3.75x"
              src="https://cdn.cafecito.app/imgs/buttons/button_5.png"
              alt="Invitame un café en cafecito.app"
              className="h-5"
            />
          </a>
        </div>
      </footer>
    </div>
  );
}

function DemoCard() {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-xl border border-[#E8E8E8] bg-[#FFFFFF]">
      {/* Header */}
      <div className="border-b border-[#E8E8E8] px-5 py-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
          FRAVEGA.COM
        </p>
        <p className="mt-1.5 text-[15px] font-medium leading-snug text-[#1A1A1A]">
          Samsung Crystal UHD 55" TU7000
        </p>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-2 divide-x divide-[#E8E8E8]">
        <div className="px-5 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
            ANTES
          </p>
          <p className="font-mono mt-2 text-[22px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
            $849.999
          </p>
          <p className="font-mono mt-1 text-[11px] tracking-[0.08em] text-[#999999]">
            15/04/2026
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#999999]">
            HOTSALE
          </p>
          <p className="font-mono mt-2 text-[22px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
            $899.999
          </p>
          <p className="font-mono mt-1 text-[11px] tracking-[0.08em] text-[#999999]">
            12/05/2026
          </p>
        </div>
      </div>

      {/* Verdict */}
      <div className="flex items-center justify-between border-t border-[#E8E8E8] px-5 py-4">
        <div>
          <p className="text-[15px] font-medium text-[#D71921]">
            Subió $50.000
          </p>
          <p className="font-mono mt-0.5 text-[11px] uppercase tracking-[0.08em] text-[#999999]">
            EL DESCUENTO ES CHAMUYO
          </p>
        </div>
        <span className="font-mono rounded-full border border-[#D71921] px-3 py-1 text-[13px] font-bold tracking-[-0.02em] text-[#D71921]">
          +5.9%
        </span>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#F5F5F5" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#F5F5F5" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#F5F5F5" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#F5F5F5" />
    </svg>
  );
}
