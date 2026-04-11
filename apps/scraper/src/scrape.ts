import { chromium, type Page } from "playwright";
import { extractSelectors } from "./extract";

type Selectors = { price: string; title: string };

type ScrapeResult = {
  title: string;
  price: number;
  selectors: Selectors;
  selectorsSource: "jsonld" | "cache" | "haiku" | "sonnet";
};

function parsePrice(text: string): number {
  // Argentine price formats: $849.999 or $849,999 or $ 849.999,00
  const cleaned = text
    .replace(/[^0-9.,]/g, "") // keep digits, dots, commas
    .replace(/\.(?=\d{3})/g, "") // remove thousand separators (dots before 3 digits)
    .replace(",", "."); // convert decimal comma to dot

  const price = parseFloat(cleaned);
  if (isNaN(price) || price <= 0) {
    throw new Error(`Failed to parse price from: "${text}"`);
  }
  return price;
}

async function extractFromJsonLd(
  page: Page,
): Promise<{ title: string; price: number } | null> {
  try {
    const jsonLdData = await page.evaluate(() => {
      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]',
      );
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent ?? "");
          // Handle single product or array of schemas
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
                return {
                  title: item.name as string,
                  price: parseFloat(
                    String(offer.price ?? offer.lowPrice),
                  ),
                };
              }
            }
          }
        } catch {
          continue;
        }
      }
      return null;
    });

    if (jsonLdData && jsonLdData.title && jsonLdData.price > 0) {
      console.log(
        `JSON-LD extraction succeeded: "${jsonLdData.title}" @ ${jsonLdData.price}`,
      );
      return jsonLdData;
    }
    return null;
  } catch {
    return null;
  }
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
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      locale: "es-AR",
      timezoneId: "America/Argentina/Buenos_Aires",
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // 1. Try JSON-LD structured data first (free, fast, most reliable)
    const jsonLdResult = await extractFromJsonLd(page);
    if (jsonLdResult) {
      return {
        ...jsonLdResult,
        selectors: { price: "jsonld", title: "jsonld" },
        selectorsSource: "jsonld",
      };
    }
    console.log("No JSON-LD Product data found, trying CSS selectors");

    // 2. Try cached CSS selectors
    if (cachedSelectors && cachedSelectors.price !== "jsonld") {
      const result = await extractWithSelectors(page, cachedSelectors);
      if (result) {
        return {
          ...result,
          selectors: cachedSelectors,
          selectorsSource: "cache",
        };
      }
      console.log(`Cached selectors failed for ${url}, extracting new ones`);
    }

    // 3. Get page HTML for Claude
    const html = await page.content();
    console.log(`Page HTML length: ${html.length}, URL: ${url}`);

    // 4. Try Haiku
    try {
      const selectors = await extractSelectors(html, "haiku");
      console.log("Haiku selectors:", JSON.stringify(selectors));
      const result = await extractWithSelectors(page, selectors);
      if (result) {
        console.log("Haiku extraction succeeded:", result.title, result.price);
        return { ...result, selectors, selectorsSource: "haiku" };
      }
      console.log("Haiku selectors didn't match any elements on page");
    } catch (error) {
      console.log("Haiku extraction failed, trying Sonnet:", error);
    }

    // 5. Fallback to Sonnet
    const selectors = await extractSelectors(html, "sonnet");
    console.log("Sonnet selectors:", JSON.stringify(selectors));
    const result = await extractWithSelectors(page, selectors);
    if (!result) {
      console.log(
        "Sonnet selectors also didn't match. Page title:",
        await page.title(),
      );
      throw new Error(
        "Failed to extract price/title even with Sonnet selectors",
      );
    }

    return { ...result, selectors, selectorsSource: "sonnet" };
  } finally {
    await browser.close();
  }
}
