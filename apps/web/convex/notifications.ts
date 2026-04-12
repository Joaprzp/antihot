import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const notifyFeedback = internalAction({
  args: {
    message: v.string(),
    page: v.string(),
  },
  handler: async (_, args) => {
    const secret = process.env.BRRR_SECRET;
    if (!secret) {
      console.warn("BRRR_SECRET not set, skipping notification");
      return;
    }

    const response = await fetch(`https://api.brrr.now/v1/${secret}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Feedback en AntiHot",
        subtitle: args.page,
        message: args.message,
      }),
    });

    if (!response.ok) {
      console.error("Brrr notification failed:", response.status);
    }
  },
});
