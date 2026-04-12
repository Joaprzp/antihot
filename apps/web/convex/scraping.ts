import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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

export const updateSnapshotPrice = internalMutation({
  args: {
    productId: v.id("products"),
    phase: v.union(v.literal("before"), v.literal("hotsale")),
    newPrice: v.number(),
  },
  handler: async (ctx, args) => {
    const snapshot = await ctx.db
      .query("snapshots")
      .withIndex("by_productId_and_phase", (q) =>
        q.eq("productId", args.productId).eq("phase", args.phase),
      )
      .first();

    if (snapshot) {
      await ctx.db.patch(snapshot._id, { price: args.newPrice });
    }
  },
});

export const markScrapeError = internalMutation({
  args: {
    productId: v.id("products"),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.productId, {
      status: "error" as const,
      errorMessage: args.errorMessage,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Cron helpers
// ─────────────────────────────────────────────────────────────────────────────

export const getUrlProductMap = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get all products with status "scraped" (skip pending/error)
    const products = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("status"), "scraped"))
      .take(100_000);

    // Group by URL
    const urlMap: Record<string, Id<"products">[]> = {};
    for (const p of products) {
      if (!urlMap[p.url]) urlMap[p.url] = [];
      urlMap[p.url].push(p._id);
    }

    return Object.entries(urlMap).map(([url, productIds]) => ({
      url,
      productIds,
      store: products.find((p) => p.url === url)!.store,
    }));
  },
});

export const upsertSnapshot = internalMutation({
  args: {
    productId: v.id("products"),
    price: v.number(),
    phase: v.union(v.literal("before"), v.literal("hotsale")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("snapshots")
      .withIndex("by_productId_and_phase", (q) =>
        q.eq("productId", args.productId).eq("phase", args.phase),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        price: args.price,
        scrapedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("snapshots", {
        productId: args.productId,
        price: args.price,
        scrapedAt: Date.now(),
        phase: args.phase,
      });
    }
  },
});
