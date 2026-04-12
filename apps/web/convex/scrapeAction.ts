"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (globalThis as any).process?.env ?? {};

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

    // Check domain selector cache
    const cached = await ctx.runQuery(internal.scraping.getCachedSelectors, {
      domain: args.store,
    });

    try {
      const response = await fetch(`${scraperUrl}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: args.url,
          selectors: cached?.selectors ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Scraper returned ${response.status}`);
      }

      const result = (await response.json()) as {
        title: string;
        price: number;
        selectors: { price: string; title: string };
        selectorsSource: "jsonld" | "cache" | "haiku";
      };

      // Cache selectors if they were freshly extracted via Claude (not jsonld or cache)
      if (
        result.selectorsSource !== "cache" &&
        result.selectorsSource !== "jsonld"
      ) {
        await ctx.runMutation(internal.scraping.cacheSelectors, {
          domain: args.store,
          selectors: result.selectors,
        });
      }

      // Save the scrape result
      await ctx.runMutation(internal.scraping.saveScrapeResult, {
        productId: args.productId,
        title: result.title,
        price: result.price,
        phase: args.phase,
      });
    } catch (error) {
      console.error("Scrape failed:", error);
      await ctx.runMutation(internal.scraping.markScrapeError, {
        productId: args.productId,
      });
    }
  },
});
