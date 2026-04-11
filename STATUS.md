# AntiHot — Project Status

**Last updated:** 2026-04-11

---

## Done

### Monorepo scaffold
- Bun workspaces: `apps/web`, `apps/scraper` (placeholder), `packages/shared`
- Vite 8 + React 19 + TypeScript strict + `@` path alias
- TanStack Router v1 file-based routing (`/` and `/dashboard`)
- Tailwind 4 with OKLCH design tokens in `index.css`
- Fontsource fonts: Playfair Display, Source Sans 3, Geist Mono + Space Grotesk, Space Mono (Nothing style)
- Hugeicons + `<Icon />` wrapper in `Shared/`
- `cn()` utility (clsx + tailwind-merge)
- Screaming architecture folders: `/Dashboard`, `/Landing`, `/Auth`, `/Shared`

### Convex backend
- Convex initialized (dev deployment: `rightful-otter-806`)
- Schema: `products` (userId, url, store, title, selectors, status), `snapshots` (productId, price, scrapedAt, phase), + auth tables
- `products.list` query — returns user's products with joined snapshots
- `products.add` mutation — validates URL, extracts store domain, creates product with `pending` status

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
- Grid layout with product cards
- Sticky URL input bar with Hugeicons link icon
- Sort controls (price/date, ASC/DESC) via TanStack Router search params + Zod
- Three card states: pending (skeleton + store domain), error (inline `ERROR: NO SE PUDO LEER`), scraped (prices + verdict)
- Empty state ("SIN PRODUCTOS")
- Delayed loading skeleton (300ms grace period to avoid flash on fast responses)
- Staggered fade-in animation on cards and skeletons (Nothing-spec easing)
- Optimistic skeleton card while adding a product

---

## In progress

Nothing currently in progress.

---

## Next up

### Phase 2 — Scraper service
- `apps/scraper/` — Hono server + Playwright (Chromium headless) + Anthropic API
- Dockerfile for Railway deployment
- **Selector cache** — `selectors_cache` table in Convex keyed by domain. One set of selectors per store, shared across all users.
- **Claude Haiku** for selector extraction (default). **Claude Sonnet** as fallback for auto-healing when cached selectors break.
- Endpoint: receives product URL + product ID → scrapes → writes snapshot + title back to Convex

### Convex integration for scraper
- HTTP action or internal function for scraper to call back with results
- Update product status (`pending` → `scraped` or `error`)
- `selectors_cache` table + query/mutation for cache lookup and writes

### HotSale cron job
- Convex scheduled function to re-scrape all products using cached selectors
- Writes `hotsale` phase snapshots
- Handles selector failures with Sonnet auto-heal escalation

### Remaining UI work
- User avatar: show real initials/photo from Google profile instead of hardcoded "JP"
- Sign-out functionality
- Delete product from dashboard
- Product card: link to original URL

### Deployment
- Cloudflare Pages for frontend
- Railway for scraper service (Docker)
- Production Convex deployment + auth config

---

## Out of scope (MVP)

- Price history beyond two dates (before + during HotSale)
- Push/email alerts
- Cross-store comparison of the same product
- Mobile native app
