import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  products: defineTable({
    userId: v.id("users"),
    url: v.string(),
    store: v.string(),
    title: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("scraped"),
      v.literal("error"),
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_status", ["userId", "status"]),

  snapshots: defineTable({
    productId: v.id("products"),
    price: v.number(),
    scrapedAt: v.number(),
    phase: v.union(v.literal("before"), v.literal("hotsale")),
  })
    .index("by_productId", ["productId"])
    .index("by_productId_and_phase", ["productId", "phase"]),

  selectorsCache: defineTable({
    domain: v.string(),
    selectors: v.object({
      price: v.string(),
      title: v.string(),
    }),
    lastVerified: v.number(),
  }).index("by_domain", ["domain"]),
});
