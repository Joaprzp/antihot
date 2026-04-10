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
| Primitives | Radix UI |
| Variants | CVA (class-variance-authority) |
| Class utils | clsx + tailwind-merge (`cn()`) |
| Icons | Hugeicons (free) |
| Global State | Zustand |
| Auth | Convex Auth (Google OAuth) |
| Scraper HTTP | Hono |
| Browser Automation | Playwright (Chromium headless) |
| Notifications | Telegram Bot API (direct HTTP) |
| AI (selector extraction + auto-heal) | Claude Sonnet via Anthropic API |
| Web Hosting | Cloudflare Pages |
| Scraper Hosting | Railway (Docker) |

## Architecture rules

- **Screaming architecture** — domain-driven folder structure (e.g. `/Dashboard`, `/Landing`, `/Auth`, `/Shared`)
- **PascalCase** for all files and folders (except Convex-required lowercase: `crons.ts`, `http.ts`, `schema.ts`)
- **Bun exclusively** — never `npx`, `npm`, or `pnpm`. Always `bun`, `bunx`, `bun run`, `bun add`.
- **Zustand** for global app state (auth session, current user, etc.)
- **TSR search params + Zod** for all URL-driven state (filters, pagination, tabs) — not Zustand
- **Colors in OKLCH** — use `oklch()` for all custom color definitions. Tailwind 4 uses OKLCH natively. Never hex or HSL.
- **Theme-aware colors** — dashboard uses semantic CSS custom properties (`--th-*`) mapped via `@theme inline` to Tailwind utilities (`bg-surface-raised`, `text-text-primary`, etc.). Never use hardcoded `text-white` or `bg-white/[0.0x]` in dashboard code — use the semantic tokens. Landing page is exempt (always light, uses raw Tailwind classes).
- **One accent color per view** rule
- **Radix UI** for accessible interactive primitives (dialogs, popovers, tooltips, dropdowns). No component library — build purpose-built components for the domain.
- **CVA** for component variants. `cn()` (clsx + twMerge) for conditional classes.
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
- **Fonts** — loaded via Fontsource with the **Latin Extended subset** (required for Spanish: á é í ó ú ü ñ ¿ ¡). Never Google Fonts CDN. Three families: **Playfair Display** (headings + landing display text, keep at large sizes), **Source Sans 3** (body text), **Geist Mono** (prices, numbers, fiscal data).

## Localization

- **Language** — all UI text, labels, error messages and copy in **Spanish (Argentine)**. Code, file names, and variable names in English.
- **Timezone** — `America/Argentina/Buenos_Aires` (GMT-3, no daylight saving). Store dates as UTC in Convex, convert to GMT-3 for display.
- **Date format** — `DD/MM/YYYY`
- **Currency** — Argentine Peso (`ARS`) as default, always use `Intl.NumberFormat` for formatting.
- **Telegram messages** — HTML parse mode (`<b>`, `<code>`). Never Markdown.
