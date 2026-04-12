# AntiHot — Project Status

**Last updated:** 2026-04-11

---

## Done

### Monorepo scaffold
- Bun workspaces: `apps/web`, `apps/scraper`, `packages/shared`
- Vite 8 + React 19 + TypeScript strict + `@` path alias
- TanStack Router v1 file-based routing (`/` and `/dashboard`)
- Tailwind 4 with OKLCH design tokens in `index.css`
- Fontsource fonts: Playfair Display, Source Sans 3, Geist Mono + Space Grotesk, Space Mono (Nothing style)
- Hugeicons + `<Icon />` wrapper, `<Spinner />` wrapper (unicode-animations) in `Shared/`
- `cn()` utility (clsx + tailwind-merge)
- Screaming architecture folders: `/Dashboard`, `/Landing`, `/Auth`, `/Shared`

### Convex backend
- Convex initialized (dev deployment: `rightful-otter-806`)
- Schema: `products` (userId, url, store, title, status), `snapshots` (productId, price, scrapedAt, phase), `selectorsCache` (domain, selectors, lastVerified), + auth tables
- `products.list` query — returns user's products with joined snapshots
- `products.add` mutation — validates URL, extracts store domain, creates product with `pending` status, schedules scrape action
- `scraping.ts` — internal functions: `getCachedSelectors`, `cacheSelectors`, `saveScrapeResult`, `markScrapeError`
- `scrapeAction.ts` — Node.js action orchestrating the scrape flow: check domain cache → call external scraper → cache new selectors → write snapshot

### Auth
- `@convex-dev/auth` + `@auth/core` with Google OAuth provider
- `ConvexAuthProvider` wrapping the app
- Landing: sign-in button triggers Google OAuth, auto-redirects to `/dashboard` on success, loading state while Convex connects
- Dashboard: redirects to `/` if unauthenticated

### Landing page
- Nothing design system: Space Grotesk + Space Mono, monochrome + single red accent
- Single viewport, no scroll
- Hero headline + subtitle + Google sign-in CTA
- Demo product card showing before/after price comparison with verdict badge

### Dashboard
- Grid layout with product cards, each with "Ver página" link to original URL
- Sticky URL input bar with Hugeicons link icon
- Sort controls (price/date, ASC/DESC) via TanStack Router search params + Zod
- Three card states: pending (unicode braille spinner), error (inline `ERROR: NO SE PUDO LEER`), scraped (prices + verdict)
- Empty state ("SIN PRODUCTOS")
- Delayed loading skeleton (300ms grace period to avoid flash on fast responses)
- Staggered fade-in animation on cards and skeletons (Nothing-spec easing)
- Optimistic skeleton card while adding a product

### Scraper service
- `apps/scraper/` — Hono server with `POST /scrape` and `GET /health`
- **Extraction priority:** 1) structured data from static HTML (JSON-LD, `__NEXT_DATA__`, inline Schema.org — covers Fravega, Cetrogar, Naldo) 2) Playwright with stealth plugin for JS-rendered pages 3) cached CSS selectors from domain cache 4) Claude Haiku (`claude-haiku-4-5-20251001`) selector extraction as last resort
- MercadoLibre: fails fast with clear Spanish error message (blocks headless browsers + API requires user OAuth)
- `mercadolibre.ts` module prepared for future ML API integration
- Argentine price format parsing (thousands dots, decimal commas)
- Domain-level selector cache in Convex (`selectorsCache` table) — shared across all users
- Deployed on Railway (Railpack builder, root directory: `apps/scraper`)
- Env vars: `ANTHROPIC_API_KEY`, `MELI_CLIENT_ID`, `MELI_CLIENT_SECRET` on Railway; `SCRAPER_URL` on Convex

### Tested ecommerce sites
- **Fravega** — works via `__NEXT_DATA__` structured data (some products) or JSON-LD
- **Cetrogar** — works via JSON-LD structured data
- **Naldo** — works via JSON-LD structured data
- **MercadoLibre** — not supported (bot detection + API auth wall)

---

## Next up

### HotSale cron job
- Convex scheduled function to re-scrape all products
- Writes `hotsale` phase snapshots
- Uses same extraction priority (structured data → cache → Haiku)

### Remaining UI work
- User avatar: show real initials/photo from Google profile instead of hardcoded "JP"
- Sign-out functionality
- Delete product from dashboard
- Error messages shown to user when scraping fails (currently silent)

### Deployment
- Cloudflare Pages for frontend
- Production Convex deployment + auth config

### Future (post-MVP)
- MercadoLibre support via user-authorized OAuth flow
- Telegram notifications on HotSale day

---

## Out of scope (MVP)

- Price history beyond two dates (before + during HotSale)
- Push/email alerts
- Cross-store comparison of the same product
- Mobile native app
