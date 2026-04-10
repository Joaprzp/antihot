function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" />
    </svg>
  );
}

function DemoCard() {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <p className="text-xs text-text-muted">fravega.com</p>
        <h3 className="mt-0.5 text-sm font-semibold leading-snug">
          Samsung Crystal UHD 55" TU7000
        </h3>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="px-5 py-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
            Antes
          </p>
          <p className="font-mono mt-1 text-lg font-bold">$849.999</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
            HotSale
          </p>
          <p className="font-mono mt-1 text-lg font-bold">$899.999</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border bg-red-light px-5 py-3">
        <p className="text-sm font-semibold text-red">⚠️ Subió $50.000</p>
        <span className="font-mono rounded-full bg-red px-2.5 py-0.5 text-xs font-bold text-white">
          +5.9%
        </span>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Navbar */}
      <nav className="flex shrink-0 items-center justify-between border-b border-border/50 px-6 py-4">
        <p className="font-heading text-xl font-bold">AntiHot</p>
        <p className="text-sm text-text-muted">HotSale 2026</p>
      </nav>

      {/* Single viewport content */}
      <main className="flex flex-1 items-center px-6">
        <div className="mx-auto grid w-full max-w-5xl gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left — copy */}
          <div className="flex flex-col justify-center">
            <h1 className="font-heading text-4xl leading-tight font-bold md:text-5xl lg:text-6xl lg:leading-tight">
              ¿Descuento real
              <br />
              <span className="italic text-accent">o verso?</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-text-secondary leading-relaxed">
              Guardá el precio de cualquier producto antes del HotSale. Nosotros
              lo revisamos el día del evento y te mostramos si el descuento es
              posta.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3 text-base font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30">
                <GoogleIcon />
                Empezar gratis
              </button>
              <p className="text-sm text-text-muted">
                Solo necesitás una cuenta de Google
              </p>
            </div>
          </div>

          {/* Right — demo card */}
          <div className="hidden items-center justify-center lg:flex">
            <DemoCard />
          </div>
        </div>
      </main>

      {/* Footer line */}
      <footer className="shrink-0 border-t border-border/50 px-6 py-3">
        <p className="text-center text-xs text-text-muted">
          Hecho en Argentina para el HotSale 2026
        </p>
      </footer>
    </div>
  );
}
