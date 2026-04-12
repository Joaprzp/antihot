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

export const isAnonymousUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    return (user as { isAnonymous?: boolean }).isAnonymous === true;
  },
});

export const currentUserId = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthUserId(ctx);
  },
});

export const mergeAnonymousProducts = mutation({
  args: {
    anonymousUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    // Don't merge with yourself
    if (args.anonymousUserId === currentUserId) {
      return { merged: false, reason: "same_user" };
    }

    // Verify the anonymous user exists AND is actually anonymous
    const anonymousUser = await ctx.db.get(args.anonymousUserId);
    if (!anonymousUser) {
      return { merged: false, reason: "anonymous_user_not_found" };
    }
    if (!(anonymousUser as { isAnonymous?: boolean }).isAnonymous) {
      return { merged: false, reason: "not_anonymous_user" };
    }

    // Get all products from anonymous account
    const anonymousProducts = await ctx.db
      .query("products")
      .withIndex("by_userId", (q) => q.eq("userId", args.anonymousUserId))
      .take(1000);

    if (anonymousProducts.length === 0) {
      return { merged: true, transferred: 0, deduplicated: 0 };
    }

    // Get all products from current (Google) account
    const currentProducts = await ctx.db
      .query("products")
      .withIndex("by_userId", (q) => q.eq("userId", currentUserId))
      .take(1000);

    // Build URL map for deduplication
    const currentProductUrls = new Map<
      string,
      { productId: typeof currentProducts[0]["_id"]; earliestSnapshot: number }
    >();

    for (const product of currentProducts) {
      const snapshots = await ctx.db
        .query("snapshots")
        .withIndex("by_productId", (q) => q.eq("productId", product._id))
        .take(10);

      const earliest = snapshots.reduce(
        (min, s) => Math.min(min, s.scrapedAt),
        Infinity,
      );

      currentProductUrls.set(product.url, {
        productId: product._id,
        earliestSnapshot: earliest === Infinity ? product._creationTime : earliest,
      });
    }

    let transferred = 0;
    let deduplicated = 0;

    // Process anonymous products
    for (const anonProduct of anonymousProducts) {
      const anonSnapshots = await ctx.db
        .query("snapshots")
        .withIndex("by_productId", (q) => q.eq("productId", anonProduct._id))
        .take(10);

      const anonEarliest = anonSnapshots.reduce(
        (min, s) => Math.min(min, s.scrapedAt),
        Infinity,
      );
      const anonTimestamp =
        anonEarliest === Infinity ? anonProduct._creationTime : anonEarliest;

      const existing = currentProductUrls.get(anonProduct.url);

      if (existing) {
        // URL exists in both accounts - keep the one with earliest snapshot
        deduplicated++;

        if (anonTimestamp < existing.earliestSnapshot) {
          // Anonymous version is older - delete current, transfer anonymous
          const currentSnapshots = await ctx.db
            .query("snapshots")
            .withIndex("by_productId", (q) => q.eq("productId", existing.productId))
            .take(100);

          for (const snapshot of currentSnapshots) {
            await ctx.db.delete(snapshot._id);
          }
          await ctx.db.delete(existing.productId);

          // Transfer anonymous product to current user
          await ctx.db.patch(anonProduct._id, { userId: currentUserId });
        } else {
          // Current version is older - delete anonymous product and its snapshots
          for (const snapshot of anonSnapshots) {
            await ctx.db.delete(snapshot._id);
          }
          await ctx.db.delete(anonProduct._id);
        }
      } else {
        // URL only in anonymous - transfer to current user
        await ctx.db.patch(anonProduct._id, { userId: currentUserId });
        transferred++;
      }
    }

    return { merged: true, transferred, deduplicated };
  },
});
