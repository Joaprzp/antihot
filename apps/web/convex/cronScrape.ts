"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 2000;
const DELAY_BETWEEN_DOMAINS_MS = 500;

export const runDailyScrape = internalAction({
  args: {},
  handler: async (ctx) => {
    // 1. Get all unique URLs with their product IDs
    const urlEntries = await ctx.runQuery(internal.scraping.getUrlProductMap);

    console.log(
      `[cron] Starting daily scrape: ${urlEntries.length} unique URLs`,
    );

    if (urlEntries.length === 0) {
      console.log("[cron] No products to scrape");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // 2. Process in batches
    for (let i = 0; i < urlEntries.length; i += BATCH_SIZE) {
      const batch = urlEntries.slice(i, i + BATCH_SIZE);

      // Group by domain for rate limiting
      const byDomain: Record<string, typeof batch> = {};
      for (const entry of batch) {
        if (!byDomain[entry.store]) byDomain[entry.store] = [];
        byDomain[entry.store].push(entry);
      }

      // Process each domain with delays
      for (const [, entries] of Object.entries(byDomain)) {
        for (const entry of entries) {
          try {
            const result = await ctx.runAction(
              internal.scrapeAction.scrapeUrlOnly,
              {
                url: entry.url,
                store: entry.store,
              },
            );

            if ("error" in result) {
              console.log(`[cron] Error scraping ${entry.url}: ${result.error}`);
              errorCount++;
              continue;
            }

            // Write snapshot to ALL products tracking this URL
            for (const productId of entry.productIds) {
              await ctx.runMutation(internal.scraping.upsertSnapshot, {
                productId,
                price: result.price,
                phase: "hotsale",
              });
            }
            successCount++;
          } catch (e) {
            // Action threw — log and continue to next URL
            console.log(
              `[cron] Action failed for ${entry.url}:`,
              e instanceof Error ? e.message : e,
            );
            errorCount++;
          }
        }

        // Delay between domains
        if (Object.keys(byDomain).length > 1) {
          await new Promise((r) => setTimeout(r, DELAY_BETWEEN_DOMAINS_MS));
        }
      }

      // Delay between batches
      if (i + BATCH_SIZE < urlEntries.length) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
      }
    }

    console.log(
      `[cron] Daily scrape complete: ${successCount} success, ${errorCount} errors`,
    );
  },
});
