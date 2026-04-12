"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (globalThis as any).process?.env ?? {};

function scraperHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret: string | undefined = env.SCRAPER_SECRET;
  if (secret) headers["Authorization"] = `Bearer ${secret}`;
  return headers;
}

export const scrapeProduct = internalAction({
  args: {
    productId: v.id("products"),
    url: v.string(),
    store: v.string(),
    phase: v.union(v.literal("before"), v.literal("hotsale")),
  },
  handler: async (ctx, args) => {
    const scraperUrl: string | undefined = env.SCRAPER_URL;
    if (!scraperUrl) {
      console.error("SCRAPER_URL not set");
      await ctx.runMutation(internal.scraping.markScrapeError, {
        productId: args.productId,
      });
      return;
    }

    const cached = await ctx.runQuery(internal.scraping.getCachedSelectors, {
      domain: args.store,
    });

    try {
      const response = await fetch(`${scraperUrl}/scrape`, {
        method: "POST",
        headers: scraperHeaders(),
        body: JSON.stringify({
          url: args.url,
          selectors: cached?.selectors ?? null,
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errorBody?.error ?? `Scraper returned ${response.status}`);
      }

      const result = (await response.json()) as {
        title: string;
        price: number;
        selectors: { price: string; title: string };
        selectorsSource: "jsonld" | "cache" | "haiku";
      };

      if (
        result.selectorsSource !== "cache" &&
        result.selectorsSource !== "jsonld"
      ) {
        await ctx.runMutation(internal.scraping.cacheSelectors, {
          domain: args.store,
          selectors: result.selectors,
        });
      }

      await ctx.runMutation(internal.scraping.saveScrapeResult, {
        productId: args.productId,
        title: result.title,
        price: result.price,
        phase: args.phase,
      });

      // Schedule background price verification via Playwright
      // Only for structured data scrapes where the price might be the list price
      if (result.selectorsSource === "jsonld") {
        await ctx.scheduler.runAfter(
          0,
          internal.scrapeAction.verifyProductPrice,
          {
            productId: args.productId,
            url: args.url,
            knownPrice: result.price,
            phase: args.phase,
          },
        );
      }
    } catch (error) {
      console.error("Scrape failed:", error);
      const raw = error instanceof Error ? error.message : "";
      let errorMessage = "No se pudo leer el precio de esta página";
      if (raw.includes("MercadoLibre")) {
        errorMessage = "MercadoLibre no está soportado todavía";
      } else if (raw.includes("URL inválida") || raw.includes("invalid")) {
        errorMessage = "La URL ingresada no es válida";
      } else if (raw.includes("timeout") || raw.includes("Timeout")) {
        errorMessage = "La página tardó demasiado en cargar";
      } else if (raw.includes("fetch failed")) {
        errorMessage = "No se pudo conectar con el servidor de scraping";
      }
      await ctx.runMutation(internal.scraping.markScrapeError, {
        productId: args.productId,
        errorMessage,
      });
    }
  },
});

export const verifyProductPrice = internalAction({
  args: {
    productId: v.id("products"),
    url: v.string(),
    knownPrice: v.number(),
    phase: v.union(v.literal("before"), v.literal("hotsale")),
  },
  handler: async (ctx, args) => {
    const scraperUrl: string | undefined = env.SCRAPER_URL;
    if (!scraperUrl) return;

    try {
      const response = await fetch(`${scraperUrl}/verify-price`, {
        method: "POST",
        headers: scraperHeaders(),
        body: JSON.stringify({
          url: args.url,
          knownPrice: args.knownPrice,
        }),
      });

      if (!response.ok) {
        console.log(`Verify returned ${response.status}, skipping`);
        return;
      }

      const result = (await response.json()) as {
        verifiedPrice: number;
        found: boolean;
      };

      if (result.found && result.verifiedPrice < args.knownPrice) {
        console.log(
          `Price verified lower: ${result.verifiedPrice} < ${args.knownPrice}, updating snapshot`,
        );
        await ctx.runMutation(internal.scraping.updateSnapshotPrice, {
          productId: args.productId,
          phase: args.phase,
          newPrice: result.verifiedPrice,
        });
      }
    } catch (error) {
      // Non-critical — the structured data price is still valid
      console.log("Price verification failed (non-critical):", error);
    }
  },
});
