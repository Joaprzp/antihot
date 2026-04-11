import { chromium, type Page } from "playwright";
import { extractSelectors } from "./extract";

type Selectors = { price: string; title: string };

type ScrapeResult = {
  title: string;
  price: number;
  selectors: Selectors;
  selectorsSource: "cache" | "haiku" | "sonnet";
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
    // Extra wait for dynamic content
    await page.waitForTimeout(2000);

    // Try cached selectors first
    if (cachedSelectors) {
      const result = await extractWithSelectors(page, cachedSelectors);
      if (result) {
        return {
          ...result,
          selectors: cachedSelectors,
          selectorsSource: "cache",
        };
      }
      // Cache miss — selectors are stale, fall through to Claude
      console.log(`Cached selectors failed for ${url}, extracting new ones`);
    }

    // Get page HTML for Claude
    const html = await page.content();

    console.log(`Page HTML length: ${html.length}, URL: ${url}`);

    // Try Haiku first
    try {
      const selectors = await extractSelectors(html, "haiku");
      console.log("Haiku selectors:", JSON.stringify(selectors));
      const result = await extractWithSelectors(page, selectors);
      if (result) {
        console.log("Haiku extraction succeeded:", result.title, result.price);
        return { ...result, selectors, selectorsSource: "haiku" };
      }
      console.log("Haiku selectors returned but didn't match any elements on page");
    } catch (error) {
      console.log("Haiku extraction failed, trying Sonnet:", error);
    }

    // Fallback to Sonnet
    const selectors = await extractSelectors(html, "sonnet");
    console.log("Sonnet selectors:", JSON.stringify(selectors));
    const result = await extractWithSelectors(page, selectors);
    if (!result) {
      console.log("Sonnet selectors also didn't match. Page title:", await page.title());
      throw new Error(
        "Failed to extract price/title even with Sonnet selectors",
      );
    }

    return { ...result, selectors, selectorsSource: "sonnet" };
  } finally {
    await browser.close();
  }
}
