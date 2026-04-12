import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

chromium.use(StealthPlugin());

// A verified price must be at least this % of the known price to be considered real
// Anything below is likely an installment amount, shipping cost, etc.
const MIN_PRICE_RATIO = 0.5;

export async function verifyPrice(
  url: string,
  knownPrice: number,
): Promise<{ verifiedPrice: number; found: boolean }> {
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

    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "font", "media"].includes(type)) {
        return route.abort();
      }
      return route.continue();
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

    try {
      await page.waitForSelector(
        'h1, [data-testid], .price, .precio, script[type="application/ld+json"]',
        { timeout: 10000 },
      );
    } catch {
      console.log("Verify: timed out waiting for content");
    }
    await page.waitForTimeout(500);

    // Look for the lowest visible product price on the page
    const priceFloor = knownPrice * MIN_PRICE_RATIO;
    const lowestPrice = await page.evaluate(
      ({ floor }) => {
        // Selectors for elements that contain installment/cuota info — skip these
        const excludePatterns = [
          '[class*="installment" i]',
          '[class*="cuota" i]',
          '[class*="quota" i]',
          '[class*="payment" i]',
          '[class*="pago" i]',
          '[class*="financing" i]',
          '[class*="financiacion" i]',
          '[class*="tax" i]',
          '[class*="impuesto" i]',
          '[class*="without-tax" i]',
          '[class*="sin-iva" i]',
        ];

        function isInsideExcluded(el: Element): boolean {
          for (const pattern of excludePatterns) {
            if (el.closest(pattern)) return true;
          }
          // Check text context — skip installments and pre-tax prices
          const parent = el.parentElement;
          if (parent) {
            const parentText = parent.textContent?.toLowerCase() ?? "";
            if (
              parentText.includes("cuota") ||
              parentText.includes("x $") ||
              parentText.includes("por mes") ||
              parentText.includes("sin impuestos") ||
              parentText.includes("sin iva") ||
              parentText.includes("sin imp") ||
              parentText.includes("ex iva") ||
              parentText.includes("neto")
            ) {
              return true;
            }
          }
          return false;
        }

        const pricePatterns = [
          '[class*="discount" i]',
          '[class*="best" i]',
          '[class*="final" i]',
          '[class*="selling" i]',
          '[class*="offer" i]',
          '[class*="promo" i]',
          '[class*="price" i]',
          '[class*="precio" i]',
          '[data-testid*="price" i]',
          '[itemprop="price"]',
          '[itemprop="lowPrice"]',
          'meta[property="product:price:amount"]',
        ];

        const prices: number[] = [];

        // Check meta tags
        const metaPrice = document.querySelector(
          'meta[property="product:price:amount"]',
        );
        if (metaPrice) {
          const val = parseFloat(metaPrice.getAttribute("content") ?? "");
          if (val > floor) prices.push(val);
        }

        // Check itemprop
        const itemPrice = document.querySelector('[itemprop="price"]');
        if (itemPrice) {
          const val = parseFloat(itemPrice.getAttribute("content") ?? "");
          if (val > floor) prices.push(val);
        }

        // Check visible text elements
        for (const selector of pricePatterns) {
          const els = document.querySelectorAll(selector);
          for (const el of els) {
            if (isInsideExcluded(el)) continue;

            const text = el.textContent ?? "";
            const match = text.match(/\$\s*([\d.]+(?:,\d+)?)/);
            if (match) {
              const cleaned = match[1]
                .replace(/\.(?=\d{3})/g, "")
                .replace(",", ".");
              const val = parseFloat(cleaned);
              if (val > floor) prices.push(val);
            }
          }
        }

        return prices.length > 0 ? Math.min(...prices) : null;
      },
      { floor: priceFloor },
    );

    if (lowestPrice && lowestPrice < knownPrice) {
      console.log(
        `Verify found lower price: ${lowestPrice} vs structured data ${knownPrice}`,
      );
      return { verifiedPrice: lowestPrice, found: true };
    }

    console.log(
      `Verify: no lower price found (lowest visible: ${lowestPrice}, known: ${knownPrice})`,
    );
    return { verifiedPrice: knownPrice, found: false };
  } finally {
    await browser.close();
  }
}
