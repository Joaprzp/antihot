import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Page } from "playwright";
import { extractSelectors } from "./extract";

chromium.use(StealthPlugin());

type Selectors = { price: string; title: string };

type ScrapeResult = {
  title: string;
  price: number;
  selectors: Selectors;
  selectorsSource: "jsonld" | "cache" | "haiku" | "sonnet";
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

function extractJsonLdFromHtml(
  html: string,
): { title: string; price: number } | null {
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "Product" && item.name && item.offers) {
          const offers = Array.isArray(item.offers)
            ? item.offers
            : [item.offers];
          const offer = offers.find(
            (o: Record<string, unknown>) => o.price || o.lowPrice,
          );
          if (offer) {
            const price = parseFloat(String(offer.price ?? offer.lowPrice));
            if (price > 0) {
              return { title: item.name, price };
            }
          }
        }
      }
    } catch {
      continue;
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
): Promise<ScrapeResult> {
  // 1. Fast path: try plain HTTP fetch + JSON-LD (no Playwright needed)
  try {
    console.log(`Trying fast JSON-LD extraction for ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "es-AR,es;q=0.9",
      },
    });
    const html = await response.text();
    const jsonLdResult = extractJsonLdFromHtml(html);
    if (jsonLdResult) {
      console.log(
        `Fast JSON-LD succeeded: "${jsonLdResult.title}" @ ${jsonLdResult.price}`,
      );
      return {
        ...jsonLdResult,
        selectors: { price: "jsonld", title: "jsonld" },
        selectorsSource: "jsonld",
      };
    }
    console.log("No JSON-LD in static HTML, falling back to Playwright");
  } catch (error) {
    console.log("Fast fetch failed, falling back to Playwright:", error);
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
    const jsonLdResult = extractJsonLdFromHtml(renderedHtml);
    if (jsonLdResult) {
      console.log(
        `Playwright JSON-LD succeeded: "${jsonLdResult.title}" @ ${jsonLdResult.price}`,
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

    // Claude Haiku
    console.log(`Page HTML length: ${renderedHtml.length}, URL: ${url}`);
    try {
      const selectors = await extractSelectors(renderedHtml, "haiku");
      console.log("Haiku selectors:", JSON.stringify(selectors));
      const result = await extractWithSelectors(page, selectors);
      if (result) {
        console.log("Haiku succeeded:", result.title, result.price);
        return { ...result, selectors, selectorsSource: "haiku" };
      }
      console.log("Haiku selectors didn't match");
    } catch (error) {
      console.log("Haiku failed, trying Sonnet:", error);
    }

    // Claude Sonnet fallback
    const selectors = await extractSelectors(renderedHtml, "sonnet");
    console.log("Sonnet selectors:", JSON.stringify(selectors));
    const result = await extractWithSelectors(page, selectors);
    if (!result) {
      console.log("Sonnet also failed. Page title:", await page.title());
      throw new Error("Failed to extract price/title even with Sonnet");
    }

    return { ...result, selectors, selectorsSource: "sonnet" };
  } finally {
    await browser.close();
  }
}
