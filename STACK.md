# Stack

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Bun |
| Framework | React 19 |
| Language | TypeScript (strict) |
| Bundler | Vite 8 |
| Backend / DB | Convex |
| Routing | TanStack Router v1 |
| Validation | Zod |
| Styling | Tailwind 4 |
| Icons | Hugeicons (free) |
| Auth | Convex Auth (Google OAuth) |
| Scraper HTTP | Hono |
| Browser Automation | Playwright (Chromium headless) |
| Notifications | Telegram Bot API (direct HTTP) |
| AI (selector extraction) | Claude Haiku via Anthropic API (last resort — most sites use structured data) |
| Web Hosting | Cloudflare Pages |
| Scraper Hosting | Railway (Railpack) |

## Architecture rules

- **Screaming architecture** — domain-driven folder structure (e.g. `/Dashboard`, `/Landing`, `/Auth`, `/Shared`)
- **PascalCase** for all files and folders (except Convex-required lowercase: `crons.ts`, `http.ts`, `schema.ts`)
- **Bun exclusively** — never `npx`, `npm`, or `pnpm`. Always `bun`, `bunx`, `bun run`, `bun add`.
- **TSR search params + Zod** for all URL-driven state (filters, pagination, tabs)
- **Convex `useQuery`/`useMutation`** for server state. No client state library.
- **Colors in OKLCH** — use `oklch()` for all custom color definitions. Tailwind 4 uses OKLCH natively. Never hex or HSL.
- **Global design tokens** — defined in `apps/web/src/index.css` via `@theme inline`: `accent`, `accent-hover`, `surface`, `surface-raised`, `black`, `text-primary`, `text-secondary`, `text-muted`, `border`, `border-visible`, `green`, `green-light`. Use these everywhere — never hardcode hex.
- **Accent color** — burnt red `oklch(0.5 0.2 25)`.
- **Landing page** — single viewport, no scroll (`h-[100dvh] overflow-hidden`). Always light theme.
- **One accent color per view** rule
- **Icons** — Hugeicons free (`@hugeicons/react` + `@hugeicons/core-free-icons`), tree-shakeable, import only what you use. Never icon fonts or SVG sprites. Use the project's `<Icon />` wrapper — never use `<HugeiconsIcon>` directly in feature code:

  ```tsx
  // Shared/Icon.tsx
  import { HugeiconsIcon } from "@hugeicons/react";
  import type { IconSvgElement } from "@hugeicons/react";

  type IconProps = {
    icon: IconSvgElement;
    size?: number;
    className?: string;
  };

  export function Icon({ icon, size = 20, className }: IconProps) {
    return (
      <HugeiconsIcon
        icon={icon}
        size={size}
        color="currentColor"
        strokeWidth={1.5}
        className={className}
      />
    );
  }
  ```

  Usage in feature code:

  ```tsx
  import { Icon } from "@/Shared/Icon";
  import { Search01Icon } from "@hugeicons/core-free-icons";

  <Icon icon={Search01Icon} size={16} className="text-text-secondary" />
  ```
- **Fonts** — loaded via Fontsource with the **Latin Extended subset** (required for Spanish: á é í ó ú ü ñ ¿ ¡). Never Google Fonts CDN. Two active families: **Source Sans 3** (body text, UI), **Geist Mono** (prices, numbers, labels). **Playfair Display** installed but reserved for future use.

## Localization

- **Language** — all UI text, labels, error messages and copy in **Spanish (Argentine)**. Code, file names, and variable names in English.
- **Timezone** — `America/Argentina/Buenos_Aires` (GMT-3, no daylight saving). Store dates as UTC in Convex, convert to GMT-3 for display.
- **Date format** — `DD/MM/YYYY`
- **Currency** — Argentine Peso (`ARS`) as default, always use `Intl.NumberFormat` for formatting.
- **Telegram messages** — HTML parse mode (`<b>`, `<code>`). Never Markdown.
