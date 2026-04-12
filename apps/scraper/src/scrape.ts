import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Page } from "playwright";
import { extractSelectors } from "./extract";
import { isMercadoLibreUrl } from "./mercadolibre";

chromium.use(StealthPlugin());

type Selectors = { price: string; title: string };

type ScrapeResult = {
  title: string;
  price: number;
  selectors: Selectors;
  selectorsSource: "jsonld" | "cache" | "haiku";
};

function parsePrice(text: string): number {
  const cleaned = text
    .replace(/[^0-9.,]/g, "")
    .replace(/\.(?=\d{3})/g, "")
    .replace(",", ".");

  const price = parseFloat(cleaned);
  if (isNaN(price) || price <= 0) {
    throw new Error(`Failed to parse price from: "${text}"`);
  }
  return price;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function findProductInObject(
  obj: unknown,
): { title: string; price: number } | null {
  if (!obj || typeof obj !== "object") return null;

  const record = obj as Record<string, unknown>;

  // Check if this object is a Product with offers
  if (record["@type"] === "Product" && record.name && record.offers) {
    const offers = Array.isArray(record.offers)
      ? record.offers
      : [record.offers];
    const offer = offers.find(
      (o: Record<string, unknown>) => o.price || o.lowPrice,
    );
    if (offer) {
      const price = parseFloat(
        String((offer as Record<string, unknown>).price ?? (offer as Record<string, unknown>).lowPrice),
      );
      if (price > 0) {
        return { title: decodeHtmlEntities(String(record.name)), price };
      }
    }
  }

  // Recurse into arrays and objects
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const result = findProductInObject(item);
      if (result) return result;
    }
  } else {
    for (const value of Object.values(record)) {
      const result = findProductInObject(value);
      if (result) return result;
    }
  }

  return null;
}

function extractStructuredDataFromHtml(
  html: string,
): { title: string; price: number } | null {
  // 1. Standard JSON-LD script tags
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const result = findProductInObject(data);
      if (result) return result;
    } catch {
      continue;
    }
  }

  // 2. Next.js __NEXT_DATA__ (Fravega, etc.)
  const nextDataMatch = html.match(
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      const result = findProductInObject(data);
      if (result) return result;
    } catch {
      // ignore parse errors
    }
  }

  // 3. Inline JSON with offers pattern (fallback regex for embedded data)
  const inlineMatch = html.match(
    /"@type"\s*:\s*"Product"[\s\S]*?"name"\s*:\s*"([^"]+)"[\s\S]*?"offers"[\s\S]*?"price"\s*:\s*(\d+(?:\.\d+)?)/,
  );
  if (inlineMatch) {
    const price = parseFloat(inlineMatch[2]);
    if (price > 0) {
      return { title: decodeHtmlEntities(inlineMatch[1]), price };
    }
  }

  return null;
}

async function extractWithSelectors(
  page: Page,
  selectors: Selectors,
): Promise<{ title: string; price: number } | null> {
  try {
    const [titleEl, priceEl] = await Promise.all([
      page.$(selectors.title),
      page.$(selectors.price),
    ]);

    if (!titleEl || !priceEl) return null;

    const [titleText, priceText] = await Promise.all([
      titleEl.textContent(),
      priceEl.textContent(),
    ]);

    if (!titleText?.trim() || !priceText?.trim()) return null;

    return {
      title: titleText.trim(),
      price: parsePrice(priceText),
    };
  } catch {
    return null;
  }
}

export async function scrape(
  url: string,
  cachedSelectors: Selectors | null,
  options?: { structuredDataOnly?: boolean },
): Promise<ScrapeResult> {
  // 0. MercadoLibre: not supported — blocks headless browsers and API requires user OAuth
  if (isMercadoLibreUrl(url)) {
    throw new Error(
      "MercadoLibre no está soportado todavía. Probá con Fravega, Cetrogar, Naldo u otras tiendas.",
    );
  }

  // 1. Fast path: try plain HTTP fetch + JSON-LD (no Playwright needed)
  try {
    console.log(`Trying fast structured data extraction for ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "es-AR,es;q=0.9",
      },
    });
    const html = await response.text();
    const jsonLdResult = extractStructuredDataFromHtml(html);
    if (jsonLdResult) {
      console.log(
        `Fast structured data succeeded: "${jsonLdResult.title}" @ ${jsonLdResult.price}`,
      );
      return {
        ...jsonLdResult,
        selectors: { price: "jsonld", title: "jsonld" },
        selectorsSource: "jsonld",
      };
    }
    console.log("No structured data in static HTML");
    if (options?.structuredDataOnly) {
      throw new Error("No structured data available (cron mode)");
    }
    console.log("Falling back to Playwright");
  } catch (error) {
    console.log("Fast fetch failed:", error);
    if (options?.structuredDataOnly) {
      throw new Error("Fast fetch failed (cron mode)");
    }
    console.log("Falling back to Playwright");
  }

  // 2. Slow path: Playwright for JS-rendered pages
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  try {
    const context = await browser.newContext({
      locale: "es-AR",
      timezoneId: "America/Argentina/Buenos_Aires",
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();

    // Block unnecessary resources for speed
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "font", "media"].includes(type)) {
        return route.abort();
      }
      return route.continue();
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

    // Wait for real content — try common product page signals
    try {
      await page.waitForSelector(
        'h1, [data-testid="product-title"], .ui-pdp-title, script[type="application/ld+json"]',
        { timeout: 10000 },
      );
    } catch {
      // Timeout waiting for content — proceed with whatever loaded
      console.log("Timed out waiting for product content signals");
    }
    await page.waitForTimeout(500);

    // Try JSON-LD from rendered page (some sites inject it via JS)
    const renderedHtml = await page.content();
    const jsonLdResult = extractStructuredDataFromHtml(renderedHtml);
    if (jsonLdResult) {
      console.log(
        `Playwright structured data succeeded: "${jsonLdResult.title}" @ ${jsonLdResult.price}`,
      );
      return {
        ...jsonLdResult,
        selectors: { price: "jsonld", title: "jsonld" },
        selectorsSource: "jsonld",
      };
    }

    // Try cached CSS selectors
    if (cachedSelectors && cachedSelectors.price !== "jsonld") {
      const result = await extractWithSelectors(page, cachedSelectors);
      if (result) {
        return {
          ...result,
          selectors: cachedSelectors,
          selectorsSource: "cache",
        };
      }
      console.log(`Cached selectors failed for ${url}`);
    }

    // Claude Haiku — last resort
    console.log(`Page HTML length: ${renderedHtml.length}, URL: ${url}`);
    const selectors = await extractSelectors(renderedHtml);
    console.log("Haiku selectors:", JSON.stringify(selectors));
    const result = await extractWithSelectors(page, selectors);
    if (!result) {
      console.log("Haiku selectors didn't match. Page title:", await page.title());
      throw new Error("Failed to extract price/title");
    }

    console.log("Haiku succeeded:", result.title, result.price);
    return { ...result, selectors, selectorsSource: "haiku" };
  } finally {
    await browser.close();
  }
}
