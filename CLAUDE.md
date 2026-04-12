# CLAUDE.md — AntiHot

> **Further reading:** [`PRD.md`](PRD.md) for full product requirements, scraping strategy, and risk analysis. [`STACK.md`](STACK.md) for the complete tech stack table, architecture rules, Icon wrapper code, and localization details. [`STATUS.md`](STATUS.md) for what's done, in progress, and next.

## What is AntiHot

A web app that tracks Argentine ecommerce product prices **before** and **during** HotSale to expose fake discounts. Users paste product URLs, the app scrapes price + title, and a cron job re-scrapes on HotSale night. The dashboard shows the delta: price went down, up, or stayed the same.

## Architecture

```
Frontend (Cloudflare Pages)          Backend (Convex)              Scraper (Railway, Railpack)
React 19 + Vite 8 + TSR  ──────►  Convex functions + DB  ◄──────  Hono + Playwright + Claude API
```

- **Frontend** — React 19, Vite 8, TanStack Router v1, Tailwind 4, Zustand, deployed on Cloudflare Pages.
- **Backend / DB** — Convex (functions, schema, crons, auth). Convex Auth with Google OAuth.
- **Scraper service** — Hono server on Railway (Railpack). Extraction priority: 1) MercadoLibre API (not yet supported) 2) structured data from static HTML (JSON-LD, `__NEXT_DATA__`, inline Schema.org) 3) cached CSS selectors 4) Claude Haiku selector extraction. Playwright with stealth plugin for JS-rendered pages.
- **Notifications** — Telegram Bot API (direct HTTP, HTML parse mode).

### Monorepo structure

```
antihot/
├── apps/
│   └── web/              # Frontend + Convex backend
│       ├── convex/       # Convex functions, schema, crons
│       └── src/
│           ├── Routes/   # TanStack Router file-based routes
│           ├── Dashboard/
│           ├── Landing/
│           ├── Auth/
│           └── Shared/   # cn(), Icon wrapper, shared UI
├── packages/
│   └── shared/           # Shared types between web and scraper
└── apps/scraper/         # Scraper service — Hono + Playwright + Claude
    ├── src/
    ├── src/
    │   ├── index.ts         # Hono server (POST /scrape, GET /health)
    │   ├── scrape.ts        # Extraction orchestration (structured data → Playwright → Haiku)
    │   ├── extract.ts       # Claude Haiku selector extraction
    │   └── mercadolibre.ts  # ML API client (prepared, not yet usable — requires user OAuth)
    └── Dockerfile
```

> **Convex guidelines:** See [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md) — always read `convex/_generated/ai/guidelines.md` before writing Convex code.

## User flow

1. Sign in with Google (Convex Auth).
2. Paste a product URL (Fravega, Cetrogar, Naldo, etc. — MercadoLibre not yet supported).
3. Fast path: plain HTTP fetch → extract structured data (JSON-LD, `__NEXT_DATA__`, inline Schema.org). No Playwright or Claude needed for most sites.
4. Slow path (if no structured data): Playwright (with stealth plugin) renders page → try cached CSS selectors → if miss, Claude Haiku extracts selectors → cached per domain for all users.
5. Product appears in dashboard with name, price, date, and "Ver página" link.
6. Background: Playwright verify pass checks for a lower visible price (discount, promo) and silently updates the snapshot if found.
7. Cron re-scrapes all products on HotSale night (structured data only, no Playwright verify — the structured data delta IS the comparison).
8. Dashboard shows delta: ✅ bajó / ⚠️ subió / ➖ igual.

### Scraping extraction priority

**Initial scrape (user adds product):**
1. **MercadoLibre API** — direct API call (not yet supported, requires user OAuth).
2. **Structured data** (JSON-LD `<script>` tags, Next.js `__NEXT_DATA__`, inline `@type:Product` patterns) — free, fast, no Playwright.
3. **Cached CSS selectors** — from `selectorsCache` table, keyed by domain.
4. **Claude Haiku** (`claude-haiku-4-5-20251001`) — extracts selectors from rendered HTML. Cached per domain for all users.
5. **Background Playwright verify** — async pass after structured data scrape to check for a lower visible price (discounts, promos). Excludes installment amounts and pre-tax prices.

**HotSale cron re-scrape:**
- Structured data only (fast path). No Playwright verify — the structured data price change IS what we're measuring.
- URL dedup: if multiple users track the same URL, scrape once and write the snapshot to all products.
- Staggered batches (100 at a time, rate-limited per domain) to avoid hammering stores.

### Scale projections

At 3,000 users × 5 products = 15,000 products on HotSale night:
- **Fast path** (structured data): ~1-2s each, 50 concurrent → ~5 min total.
- **No Playwright** on cron night → Railway load is minimal (just HTTP fetches).
- **URL dedup** reduces actual scrapes significantly (many users track the same popular products).
- Cost: zero Claude calls (all structured data). Railway cost: negligible (no Chromium on cron night).

## Code conventions

### Language & naming
- **TypeScript strict** everywhere.
- **PascalCase** for all files and folders, except Convex-required lowercase (`crons.ts`, `http.ts`, `schema.ts`).
- **Screaming architecture** — domain-driven folders: `/Dashboard`, `/Landing`, `/Auth`, `/Shared`, etc. Not `/components`, `/hooks`, `/utils`.
- Code, file names, variable names in **English**.
- All UI text, labels, error messages in **Spanish (Argentine)**.

### Package manager
- **Bun exclusively** — `bun`, `bunx`, `bun run`, `bun add`. Never `npx`, `npm`, `pnpm`.

### Styling
- **Tailwind 4** with **OKLCH** for all custom colors. Never hex or HSL.
- **Global design tokens** defined in `index.css` via `@theme inline` — `accent`, `surface`, `surface-raised`, `text-primary`, `text-secondary`, `text-muted`, `border`, `green`, `red`, `neutral` (with `-light` variants). Use these everywhere.
- **Accent color** — burnt red `oklch(0.55 0.22 27)`.
- **Landing page** — single viewport, no scroll (`h-screen overflow-hidden`). Always light theme.
- **One accent color per view**.
- **CVA** for component variants. **`cn()`** (clsx + tailwind-merge) for conditional classes.

### Components & icons
- **Radix UI** for interactive primitives (dialogs, popovers, tooltips, dropdowns). No component library — build purpose-built components.
- **Hugeicons** (`@hugeicons/react` + `@hugeicons/core-free-icons`). Always use the project's `<Icon />` wrapper from `@/Shared/Icon`, never `<HugeiconsIcon>` directly in feature code.

### Fonts
- Loaded via **Fontsource** with **Latin Extended** subset.
- **Playfair Display** — headings and landing display text only. Keep at large sizes.
- **Source Sans 3** — body text.
- **Geist Mono** — prices, numbers, fiscal data.

### State management
- **Zustand** for global app state (auth session, current user).
- **TanStack Router search params + Zod** for all URL-driven state (filters, pagination, tabs). Not Zustand.

### Localization
- Timezone: `America/Argentina/Buenos_Aires` (GMT-3). Store UTC in Convex, display in GMT-3.
- Date format: `DD/MM/YYYY`.
- Currency: ARS via `Intl.NumberFormat`.
- Telegram messages: HTML parse mode (`<b>`, `<code>`). Never Markdown.

## Commit messages

- **LLM-first** — descriptive, context-rich, structured for machine readability. No traditional shorthand.
- **No `Co-Authored-By`** trailer.

## MVP scope

**In scope:** Google auth, URL submission, Playwright + Claude scraping, domain-level selector cache, price snapshot storage, HotSale cron re-scrape, before/during price delta display.

**Out of scope:** Price history beyond two dates, push/email alerts, cross-store comparison, mobile native app.

## Key risks to keep in mind

- Scraper blocking → mitigate with stealth plugin, realistic User-Agent, and request delays.
- Selector breakage → re-run Haiku extraction + update domain cache.
- Cron failure on HotSale night = total loss of value for that cycle.
- **MercadoLibre not supported** — blocks headless browsers and API requires user-authorized OAuth. Documented as known limitation.
- Domain cache assumes one selector pattern per store.
