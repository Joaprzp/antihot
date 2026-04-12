import { Hono } from "hono";
import { scrape } from "./scrape";
import { verifyPrice } from "./verify";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/scrape", async (c) => {
  const body = await c.req.json<{
    url: string;
    selectors: { price: string; title: string } | null;
  }>();

  if (!body.url) {
    return c.json({ error: "URL is required" }, 400);
  }

  try {
    const result = await scrape(body.url, body.selectors);
    return c.json(result);
  } catch (error) {
    console.error("Scrape error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Scrape failed" },
      500,
    );
  }
});

app.post("/verify-price", async (c) => {
  const body = await c.req.json<{
    url: string;
    knownPrice: number;
  }>();

  if (!body.url || !body.knownPrice) {
    return c.json({ error: "url and knownPrice are required" }, 400);
  }

  try {
    const result = await verifyPrice(body.url, body.knownPrice);
    return c.json(result);
  } catch (error) {
    console.error("Verify error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Verify failed" },
      500,
    );
  }
});

const port = parseInt(process.env.PORT ?? "3001");
console.log(`Scraper running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
