# CLAUDE.md — AntiHot

> **Further reading:** [`PRD.md`](PRD.md) for full product requirements, scraping strategy, and risk analysis. [`STACK.md`](STACK.md) for the complete tech stack table, architecture rules, Icon wrapper code, and localization details.

## What is AntiHot

A web app that tracks Argentine ecommerce product prices **before** and **during** HotSale to expose fake discounts. Users paste product URLs, the app scrapes price + title, and a cron job re-scrapes on HotSale night. The dashboard shows the delta: price went down, up, or stayed the same.

## Architecture

```
Frontend (Cloudflare Pages)          Backend (Convex)              Scraper (Railway, Docker)
React 19 + Vite 8 + TSR  ──────►  Convex functions + DB  ◄──────  Hono + Playwright + Claude API
```

- **Frontend** — React 19, Vite 8, TanStack Router v1, Tailwind 4, Zustand, deployed on Cloudflare Pages.
- **Backend / DB** — Convex (functions, schema, crons, auth). Convex Auth with Google OAuth.
- **Scraper service** — Hono server on Railway. Playwright (Chromium headless) fetches pages. Claude Sonnet extracts CSS selectors for price and title from raw HTML. Auto-heals broken selectors by re-calling Claude.
- **Notifications** — Telegram Bot API (direct HTTP, HTML parse mode).

## User flow

1. Sign in with Google (Convex Auth).
2. Paste a product URL (MercadoLibre, Fravega, Naldo, etc.).
3. Scraper extracts title + price via Playwright + Claude selector extraction → snapshot saved in Convex.
4. Product appears in dashboard with name, price, date.
5. Cron re-scrapes all products on HotSale night.
6. Dashboard shows delta: ✅ bajó / ⚠️ subió / ➖ igual.

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
- **Semantic CSS custom properties** (`--th-*`) mapped via `@theme inline` to Tailwind utilities (`bg-surface-raised`, `text-text-primary`). Never hardcoded `text-white` or `bg-white` in dashboard code.
- Landing page is exempt from theme tokens (always light, raw Tailwind classes).
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

**In scope:** Google auth, URL submission, Playwright + Claude scraping, price snapshot storage, HotSale cron re-scrape, before/during price delta display.

**Out of scope:** Price history beyond two dates, push/email alerts, cross-store comparison, mobile native app.

## Key risks to keep in mind

- Scraper blocking → mitigate with realistic User-Agent and request delays.
- Selector breakage → Claude auto-healing.
- Cron failure on HotSale night = total loss of value for that cycle.
