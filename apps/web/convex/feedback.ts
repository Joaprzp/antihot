import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const submit = mutation({
  args: {
    message: v.string(),
    page: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const message = args.message.trim();

    await ctx.db.insert("feedback", {
      userId: userId ?? undefined,
      message,
      page: args.page,
    });

    await ctx.scheduler.runAfter(0, internal.notifications.notifyFeedback, {
      message,
      page: args.page,
    });
  },
});
