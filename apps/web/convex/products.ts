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

    // Also check the users table for the image field (Convex Auth stores it there)
    const userId = await getAuthUserId(ctx);
    let image: string | null = null;
    if (userId) {
      const user = await ctx.db.get(userId);
      if (user && "image" in user) {
        image = (user.image as string) ?? null;
      }
    }

    return {
      name: identity.name ?? null,
      email: identity.email ?? null,
      pictureUrl: identity.pictureUrl ?? image ?? null,
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

    // Rate limit: max 10 products per user per minute
    const oneMinuteAgo = Date.now() - 60_000;
    const recentProducts = await ctx.db
      .query("products")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);
    const recentCount = recentProducts.filter(
      (p) => p._creationTime > oneMinuteAgo,
    ).length;
    if (recentCount >= 10) {
      throw new Error("Demasiados productos agregados. Esperá un momento.");
    }

    // Validate URL
    let store = "";
    try {
      const parsed = new URL(args.url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Solo URLs HTTP/HTTPS");
      }
      const hostname = parsed.hostname;
      if (
        /^(127\.|localhost|0\.0\.0\.0|169\.254|192\.168|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|::1|fc00:|fe80:)/.test(
          hostname,
        )
      ) {
        throw new Error("URL no permitida");
      }
      store = hostname.replace("www.", "");
    } catch (e) {
      if (e instanceof Error && e.message !== "URL inválida") throw e;
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
