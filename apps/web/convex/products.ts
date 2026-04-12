import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const products = await ctx.db
      .query("products")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(100);

    const productsWithSnapshots = await Promise.all(
      products.map(async (product) => {
        const snapshots = await ctx.db
          .query("snapshots")
          .withIndex("by_productId", (q) => q.eq("productId", product._id))
          .take(10);

        const before = snapshots.find((s) => s.phase === "before");
        const hotsale = snapshots.find((s) => s.phase === "hotsale");

        return {
          ...product,
          priceBefore: before?.price ?? null,
          priceHotsale: hotsale?.price ?? null,
          dateBefore: before?.scrapedAt ?? null,
          dateHotsale: hotsale?.scrapedAt ?? null,
        };
      }),
    );

    return productsWithSnapshots;
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return {
      name: identity.name ?? null,
      email: identity.email ?? null,
      pictureUrl: identity.pictureUrl ?? null,
    };
  },
});

export const add = mutation({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let store = "";
    try {
      store = new URL(args.url).hostname.replace("www.", "");
    } catch {
      throw new Error("URL inválida");
    }

    const productId = await ctx.db.insert("products", {
      userId,
      url: args.url,
      store,
      title: undefined,
      status: "pending",
    });

    await ctx.scheduler.runAfter(0, internal.scrapeAction.scrapeProduct, {
      productId,
      url: args.url,
      store,
      phase: "before",
    });

    return productId;
  },
});

export const remove = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const product = await ctx.db.get(args.productId);
    if (!product || product.userId !== userId) {
      throw new Error("Product not found");
    }

    // Delete associated snapshots
    const snapshots = await ctx.db
      .query("snapshots")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .take(100);

    for (const snapshot of snapshots) {
      await ctx.db.delete(snapshot._id);
    }

    await ctx.db.delete(args.productId);
  },
});
