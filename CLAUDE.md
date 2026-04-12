# CLAUDE.md — AntiHot

> **Further reading:** [`PRD.md`](PRD.md) for full product requirements, scraping strategy, and risk analysis. [`STACK.md`](STACK.md) for the complete tech stack table, architecture rules, Icon wrapper code, and localization details. [`STATUS.md`](STATUS.md) for what's done, in progress, and next.

## What is AntiHot

A web app that tracks Argentine ecommerce product prices **before** and **during** HotSale to expose fake discounts. Users paste product URLs, the app scrapes price + title, and a daily cron job re-scrapes all products. The dashboard shows the delta: price went down, up, or stayed the same.

## Architecture

```
Frontend (Cloudflare Pages)          Backend (Convex)              Scraper (Railway, Railpack)
React 19 + Vite 8 + TSR  ──────►  Convex functions + DB  ◄──────  Hono + Playwright + Claude API
```

- **Frontend** — React 19, Vite 8, TanStack Router v1, Tailwind 4, deployed on Cloudflare Pages.
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
│           └── Shared/   # Icon wrapper
├── packages/
│   └── shared/           # Shared types (placeholder, not yet used)
└── apps/scraper/         # Scraper service — Hono + Playwright + Claude
    └── src/
        ├── index.ts         # Hono server (POST /scrape, GET /health) + auth middleware
        ├── scrape.ts        # Extraction orchestration (structured data → Playwright → Haiku)
        ├── extract.ts       # Claude Haiku selector extraction
        ├── verify.ts        # Background Playwright price verification
        └── mercadolibre.ts  # ML URL detection (API client prepared, not yet usable)
```

> **Convex guidelines:** See [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md) — always read `convex/_generated/ai/guidelines.md` before writing Convex code.

## User flow

1. Land on homepage → click "Empezar sin cuenta" (anonymous) or "Tengo cuenta" (Google OAuth).
2. Paste a product URL (Fravega, Cetrogar, Naldo, etc. — MercadoLibre not yet supported).
3. Optional: click "Vincular cuenta" in dashboard to upgrade to Google for cross-device persistence.
4. Fast path: plain HTTP fetch → extract structured data (JSON-LD, `__NEXT_DATA__`, inline Schema.org). No Playwright or Claude needed for most sites.
5. Slow path (if no structured data): Playwright (with stealth plugin) renders page → try cached CSS selectors → if miss, Claude Haiku extracts selectors → cached per domain for all users.
6. Product appears in dashboard with name, price, date, and "Ver página" link.
7. Background: Playwright verify pass checks for a lower visible price (discount, promo) and silently updates the snapshot if found.
8. Daily cron (03:00 AM Argentina) re-scrapes all products (structured data only, no Playwright verify — the structured data delta IS the comparison).
9. Dashboard shows delta: ✅ bajó / ⚠️ subió / ➖ igual.

### Scraping extraction priority

**Initial scrape (user adds product):**
1. **MercadoLibre API** — direct API call (not yet supported, requires user OAuth).
2. **Structured data** (JSON-LD `<script>` tags, Next.js `__NEXT_DATA__`, inline `@type:Product` patterns) — free, fast, no Playwright.
3. **Cached CSS selectors** — from `selectorsCache` table, keyed by domain.
4. **Claude Haiku** (`claude-haiku-4-5-20251001`) — extracts selectors from rendered HTML. Cached per domain for all users.
5. **Background Playwright verify** — async pass after structured data scrape to check for a lower visible price (discounts, promos). Excludes installment amounts and pre-tax prices.

**Daily cron re-scrape (03:00 AM Argentina / 06:00 UTC):**
- Structured data only (fast path). No Playwright verify — the structured data price change IS what we're measuring.
- URL dedup: if multiple users track the same URL, scrape once and write the snapshot to all products.
- Upsert logic: updates existing `hotsale` snapshots, doesn't create duplicates.
- Staggered batches (50 at a time, 500ms between domains, 2s between batches) to avoid hammering stores.
- Manual trigger: `npx convex run cronScrape:runDailyScrape`

### Scale projections

At 3,000 users × 5 products = 15,000 products:
- **Fast path** (structured data): ~1-2s each, batches of 50 → ~10 min total.
- **No Playwright** on cron → Railway load is minimal (just HTTP fetches).
- **URL dedup** reduces actual scrapes significantly (many users track the same popular products).
- Cost: zero Claude calls (all structured data). Railway cost: negligible (no Chromium on cron).
- Daily cron currently; can switch to event-based (HotSale night only) when user volume justifies it.

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
- **Global design tokens** defined in `index.css` via `@theme inline` — `accent`, `accent-hover`, `surface`, `surface-raised`, `black`, `text-primary`, `text-secondary`, `text-muted`, `border`, `border-visible`, `green`, `green-light`. Use these everywhere — never hard-code hex.
- **Accent color** — burnt red `oklch(0.5 0.2 25)`.
- **Landing page** — single viewport, no scroll (`h-[100dvh] overflow-hidden`). Always light theme.
- **One accent color per view**.

### Components & icons
- **Hugeicons** (`@hugeicons/react` + `@hugeicons/core-free-icons`). Always use the project's `<Icon />` wrapper from `@/Shared/Icon`, never `<HugeiconsIcon>` directly in feature code.

### Fonts
- Loaded via **Fontsource** with **Latin Extended** subset.
- **Source Sans 3** (`font-body`) — body text, product titles, UI text.
- **Geist Mono** (`font-mono`) — prices, numbers, ALL CAPS labels, buttons, metadata.
- **Playfair Display** (`font-heading`) — available but currently unused. Reserved for future editorial/display use.

### State management
- **TanStack Router search params + Zod** for all URL-driven state (filters, pagination, tabs).
- **Convex `useQuery`/`useMutation`** for server state. No client state library needed.

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
