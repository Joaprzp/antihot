import { Hono } from "hono";
import { scrape } from "./scrape";
import { verifyPrice } from "./verify";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .filter(Boolean);

const app = new Hono();

// Auth middleware — only Convex backend should call this
app.use("*", async (c, next) => {
  const origin = c.req.header("origin") ?? "";
  const scraperSecret = process.env.SCRAPER_SECRET;

  // Health check is public
  if (c.req.path === "/health") return next();

  // Verify shared secret if set
  if (scraperSecret) {
    const authHeader = c.req.header("authorization");
    if (authHeader !== `Bearer ${scraperSecret}`) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  }

  // CORS: only allow known origins (or skip if called server-to-server with no origin)
  if (origin && ALLOWED_ORIGINS.length > 0 && !ALLOWED_ORIGINS.includes(origin)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  return next();
});

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/scrape", async (c) => {
  const body = await c.req.json<{
    url: string;
    selectors: { price: string; title: string } | null;
    structuredDataOnly?: boolean;
  }>();

  if (!body.url) {
    return c.json({ error: "URL is required" }, 400);
  }

  try {
    const result = await scrape(body.url, body.selectors, {
      structuredDataOnly: body.structuredDataOnly,
    });
    return c.json(result);
  } catch (error) {
    console.error("Scrape error:", error);
    const raw = error instanceof Error ? error.message : "";
    // Only pass through known safe messages, sanitize the rest
    const safe = raw.includes("MercadoLibre") ? raw : "No se pudo leer el precio";
    return c.json({ error: safe }, 500);
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
    return c.json({ error: "Verificación de precio fallida" }, 500);
  }
});

const port = parseInt(process.env.PORT ?? "3001");
console.log(`Scraper running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
