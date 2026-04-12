# AntiHot — Project Status

**Last updated:** 2026-04-12

---

## Done

### Monorepo scaffold
- Bun workspaces: `apps/web`, `apps/scraper`, `packages/shared`
- Vite 8 + React 19 + TypeScript strict + `@` path alias
- TanStack Router v1 file-based routing (`/` and `/dashboard`)
- Tailwind 4 with OKLCH design tokens in `index.css`
- Fontsource fonts: Source Sans 3 (body), Geist Mono (numbers/labels), Playfair Display (reserved)
- Hugeicons + `<Icon />` wrapper in `Shared/`
- Screaming architecture folders: `/Dashboard`, `/Landing`, `/Auth`, `/Shared`

### Convex backend
- Convex initialized (dev deployment: `rightful-otter-806`)
- Schema: `products` (userId, url, store, title, status), `snapshots` (productId, price, scrapedAt, phase), `selectorsCache` (domain, selectors, lastVerified), + auth tables
- `products.list` query — returns user's products with joined snapshots
- `products.add` mutation — validates URL, extracts store domain, creates product with `pending` status, schedules scrape action
- `scraping.ts` — internal functions: `getCachedSelectors`, `cacheSelectors`, `saveScrapeResult`, `markScrapeError`
- `scrapeAction.ts` — Node.js action orchestrating the scrape flow: check domain cache → call external scraper → cache new selectors → write snapshot

### Auth
- `@convex-dev/auth` + `@auth/core` with Anonymous + Google OAuth providers
- Anonymous-first: users auto-sign-in anonymously on first visit, no account required
- Optional Google upgrade via "Vincular cuenta" button in dashboard nav
- Account linking merges products with URL deduplication (keeps earliest snapshot)
- `ConvexAuthProvider` wrapping the app
- Dashboard: redirects to `/` if unauthenticated

### Landing page
- Monochrome + single red accent, Source Sans 3 + Geist Mono
- Single viewport, no scroll (`h-[100dvh]`)
- Hero headline ("Descuento o verso?") with accent-colored "verso?"
- Mobile: compact demo card above the fold, centered stacked layout
- Desktop: side-by-side copy + full demo card
- Dual CTA buttons: "Empezar sin cuenta" (anonymous) + "Tengo cuenta" (Google OAuth)
- Full WCAG focus-visible indicators, semantic HTML, aria-labels

### Dashboard
- Grid layout with product cards
- "Ver página" link + delete button (trash icon) on each card header
- Product titles truncated single-line with clickable `···` pill linking to original URL
- Sticky URL input bar with Hugeicons link icon, shrinks on scroll (width + height + font animate down)
- Sort controls (price/date, ASC/DESC) via TanStack Router search params + Zod
- HotSale date info shown once above grid (not repeated per card)
- Three card states: pending (skeleton shimmer), error (real error message from scraper), scraped (prices + verdict)
- Empty state ("SIN PRODUCTOS")
- Delayed loading skeleton (300ms grace period to avoid flash on fast responses)
- Fade-in animation on cards (respects prefers-reduced-motion)
- Pending cards pinned to top of grid until data arrives
- Background Playwright price verification — async pass after structured data scrape, excludes installments and pre-tax amounts
- Equal height product cards across all states
- Sign-out ("Salir") in nav
- Google profile avatar (falls back to initials)
- Cafecito donation button on landing and dashboard nav
- Fonts: Source Sans 3 (body) + Geist Mono (labels/prices)

### Scraper service
- `apps/scraper/` — Hono server with `POST /scrape` and `GET /health`
- **Extraction priority:** 1) structured data from static HTML (JSON-LD, `__NEXT_DATA__`, inline Schema.org — covers Fravega, Cetrogar, Naldo) 2) Playwright with stealth plugin for JS-rendered pages 3) cached CSS selectors from domain cache 4) Claude Haiku (`claude-haiku-4-5-20251001`) selector extraction as last resort
- MercadoLibre: fails fast with clear Spanish error message (blocks headless browsers + API requires user OAuth)
- `mercadolibre.ts` module prepared for future ML API integration
- Argentine price format parsing (thousands dots, decimal commas)
- Domain-level selector cache in Convex (`selectorsCache` table) — shared across all users
- Auth middleware: shared secret (`SCRAPER_SECRET`) between Convex and Railway, origin validation
- Error messages sanitized — no internal details leak to users
- Deployed on Railway (Railpack builder, root directory: `apps/scraper`)
- Env vars: `ANTHROPIC_API_KEY`, `MELI_CLIENT_ID`, `MELI_CLIENT_SECRET`, `SCRAPER_SECRET` on Railway; `SCRAPER_URL`, `SCRAPER_SECRET` on Convex

### Security
- CORS + shared secret auth on scraper endpoints
- Rate limiting: max 10 products per user per minute
- SSRF protection: blocks private IPs, localhost, non-HTTP(S) schemes
- All Convex mutations verify auth via `getAuthUserId`
- Product ownership verified on delete
- Sensitive functions use `internalMutation`/`internalQuery`
- Error messages sanitized in Spanish, no internal details leaked
- All external links have `rel="noopener noreferrer"`
- `prefers-reduced-motion` respected for animations

### Daily price cron
- Convex scheduled function runs daily at 03:00 AM Argentina time (06:00 UTC)
- **Structured data only** — no Playwright verify on cron (fast, cheap, Railway-friendly)
- **URL dedup** — same URL tracked by multiple users → scrape once, write snapshot to all
- **Upsert logic** — daily runs update existing `hotsale` snapshots, not create duplicates
- **Rate limiting** — staggered batches (50 URLs), 500ms delay between domains, 2s between batches
- Manual trigger: `npx convex run cronScrape:runDailyScrape`

### Deployment
- Cloudflare Pages for frontend (auto-deploy from main)
- Production Convex deployment with auth config

### Tested ecommerce sites
- **Fravega** — works via `__NEXT_DATA__` structured data
- **Cetrogar** — works via JSON-LD structured data
- **Naldo** — works via JSON-LD structured data
- **Jumbo** — works via structured data (JS-rendered, Playwright fallback)
- **Kitart** — works via structured data
- **MercadoLibre** — not supported (bot detection + API auth wall)

---

## Next up

### Remaining polish
- Empty state improvements (optional)

### Scale prep (when needed)
- Event-based cron (HotSale night only) instead of daily
- Larger batch sizes, tighter rate limits

### Future (post-MVP)
- MercadoLibre support via user-authorized OAuth flow
- Telegram notifications on HotSale day

---

## Out of scope (MVP)

- Price history beyond two dates (before + during HotSale)
- Push/email alerts
- Cross-store comparison of the same product
- Mobile native app
