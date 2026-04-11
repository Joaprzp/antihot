import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const getCachedSelectors = internalQuery({
  args: { domain: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("selectorsCache")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .first();
  },
});

export const cacheSelectors = internalMutation({
  args: {
    domain: v.string(),
    selectors: v.object({ price: v.string(), title: v.string() }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("selectorsCache")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        selectors: args.selectors,
        lastVerified: Date.now(),
      });
    } else {
      await ctx.db.insert("selectorsCache", {
        domain: args.domain,
        selectors: args.selectors,
        lastVerified: Date.now(),
      });
    }
  },
});

export const saveScrapeResult = internalMutation({
  args: {
    productId: v.id("products"),
    title: v.string(),
    price: v.number(),
    phase: v.union(v.literal("before"), v.literal("hotsale")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.productId, {
      title: args.title,
      status: "scraped" as const,
    });

    await ctx.db.insert("snapshots", {
      productId: args.productId,
      price: args.price,
      scrapedAt: Date.now(),
      phase: args.phase,
    });
  },
});

export const markScrapeError = internalMutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.productId, {
      status: "error" as const,
    });
  },
});
