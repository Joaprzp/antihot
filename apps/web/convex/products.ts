import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
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
      selectors: undefined,
      status: "pending",
    });

    return productId;
  },
});
