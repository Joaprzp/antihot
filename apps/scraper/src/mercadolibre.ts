let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.MELI_CLIENT_ID;
  const clientSecret = process.env.MELI_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("MELI_CLIENT_ID and MELI_CLIENT_SECRET are required");
  }

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`ML OAuth failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  console.log("ML access token refreshed");
  return cachedToken.token;
}

export function isMercadoLibreUrl(url: string): boolean {
  return url.includes("mercadolibre.com");
}

function extractItemId(url: string): string | null {
  // Format: /MLA-1234567-product-name or /MLA1234567
  const match = url.match(/\/(MLA)-?(\d+)/i);
  return match ? `${match[1]}${match[2]}` : null;
}

function extractProductId(url: string): string | null {
  // Format: /p/MLA48922190
  const match = url.match(/\/p\/(MLA\d+)/i);
  return match ? match[1] : null;
}

async function fetchWithToken(
  endpoint: string,
): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`https://api.mercadolibre.com${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function getFromItemsApi(
  itemId: string,
): Promise<{ title: string; price: number } | null> {
  const response = await fetchWithToken(`/items/${itemId}`);
  if (!response.ok) {
    console.log(`ML items API returned ${response.status} for ${itemId}`);
    return null;
  }

  const data = (await response.json()) as {
    title: string;
    price: number;
    currency_id: string;
  };

  if (!data.title || !data.price) return null;

  console.log(
    `ML items API succeeded: "${data.title}" @ ${data.price} ${data.currency_id}`,
  );
  return { title: data.title, price: data.price };
}

async function getFromProductsApi(
  productId: string,
): Promise<{ title: string; price: number } | null> {
  // Try to get the product info first
  const prodResponse = await fetchWithToken(`/products/${productId}`);
  if (!prodResponse.ok) {
    console.log(
      `ML products API returned ${prodResponse.status} for ${productId}`,
    );
    return null;
  }

  const prodData = (await prodResponse.json()) as {
    name: string;
    buy_box_winner?: { price: number; currency_id: string };
  };

  if (prodData.name && prodData.buy_box_winner?.price) {
    console.log(
      `ML products API succeeded: "${prodData.name}" @ ${prodData.buy_box_winner.price}`,
    );
    return { title: prodData.name, price: prodData.buy_box_winner.price };
  }

  // Fallback: search for items with this catalog_product_id
  const searchResponse = await fetchWithToken(
    `/sites/MLA/search?catalog_product_id=${productId}&sort=price_asc&limit=1`,
  );
  if (!searchResponse.ok) {
    console.log(`ML search API returned ${searchResponse.status}`);
    return null;
  }

  const searchData = (await searchResponse.json()) as {
    results: Array<{ title: string; price: number; currency_id: string }>;
  };

  if (searchData.results?.length > 0) {
    const item = searchData.results[0];
    console.log(
      `ML search API succeeded: "${item.title}" @ ${item.price} ${item.currency_id}`,
    );
    return { title: item.title, price: item.price };
  }

  return null;
}

export async function scrapeFromMeliApi(
  url: string,
): Promise<{ title: string; price: number } | null> {
  // Check if it's a catalog product URL (/p/MLA...)
  const productId = extractProductId(url);
  if (productId) {
    console.log(`Detected ML catalog product: ${productId}`);
    return getFromProductsApi(productId);
  }

  // Check if it's an item listing URL (/MLA-...)
  const itemId = extractItemId(url);
  if (itemId) {
    console.log(`Detected ML item listing: ${itemId}`);
    return getFromItemsApi(itemId);
  }

  console.log("Could not extract ML ID from URL:", url);
  return null;
}
